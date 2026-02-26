import { promises as fs } from "node:fs";
import path from "node:path";
import { isPostgresConfigured, withDbClient } from "@/lib/server/db";

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : path.join(process.cwd(), "data");
const LOCK_DIR = path.join(DATA_DIR, "automation.lock");
const LEASE_FILE = path.join(LOCK_DIR, "lease.json");

interface LeasePayload {
  ownerId: string;
  expiresAt: number;
  updatedAt: number;
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function writeLease(ownerId: string, leaseMs: number): Promise<void> {
  const now = Date.now();
  const payload: LeasePayload = {
    ownerId,
    expiresAt: now + leaseMs,
    updatedAt: now,
  };
  await fs.writeFile(LEASE_FILE, JSON.stringify(payload), "utf8");
}

async function readLease(): Promise<LeasePayload | null> {
  try {
    const raw = await fs.readFile(LEASE_FILE, "utf8");
    return JSON.parse(raw) as LeasePayload;
  } catch {
    return null;
  }
}

async function removeLeaseDir(): Promise<void> {
  await fs.rm(LOCK_DIR, { recursive: true, force: true });
}

export async function ensureSchedulerLease(ownerId: string, leaseMs: number): Promise<boolean> {
  if (isPostgresConfigured()) {
    return withDbClient(async (client) => {
      await client.query("BEGIN");
      try {
        const existing = await client.query<{
          owner_id: string;
          expires_at: string;
        }>(
          "SELECT owner_id, expires_at FROM cert_scheduler_lease WHERE key = 'global' FOR UPDATE"
        );
        const now = Date.now();
        const nextExpiryIso = new Date(now + leaseMs).toISOString();
        if (existing.rows.length === 0) {
          await client.query(
            `
            INSERT INTO cert_scheduler_lease (key, owner_id, expires_at, updated_at)
            VALUES ('global', $1, $2::timestamptz, NOW())
          `,
            [ownerId, nextExpiryIso]
          );
          await client.query("COMMIT");
          return true;
        }

        const row = existing.rows[0];
        const expiresTs = new Date(row.expires_at).getTime();
        if (row.owner_id === ownerId || expiresTs <= now) {
          await client.query(
            `
            UPDATE cert_scheduler_lease
            SET owner_id = $1, expires_at = $2::timestamptz, updated_at = NOW()
            WHERE key = 'global'
          `,
            [ownerId, nextExpiryIso]
          );
          await client.query("COMMIT");
          return true;
        }
        await client.query("COMMIT");
        return false;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      }
    });
  }

  await ensureDataDir();

  try {
    await fs.mkdir(LOCK_DIR);
    await writeLease(ownerId, leaseMs);
    return true;
  } catch {
    // Directory already exists: check lease owner/expiry.
    const lease = await readLease();
    const now = Date.now();
    if (!lease || lease.expiresAt <= now) {
      await removeLeaseDir();
      try {
        await fs.mkdir(LOCK_DIR);
        await writeLease(ownerId, leaseMs);
        return true;
      } catch {
        return false;
      }
    }
    if (lease.ownerId === ownerId) {
      await writeLease(ownerId, leaseMs);
      return true;
    }
    return false;
  }
}
