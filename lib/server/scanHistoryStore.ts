import { promises as fs } from "node:fs";
import path from "node:path";
import { dbQuery, isPostgresConfigured } from "@/lib/server/db";

export interface ClientScanSnapshot {
  clientId: string;
  clientName: string;
  source: "manual" | "automation";
  scannedAt: string;
  activeIds: string[];
  flaggedActiveIds: string[];
}

interface ScanHistoryState {
  scans: ClientScanSnapshot[];
  updatedAt: string;
}

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "scan-history.json");

const EMPTY: ScanHistoryState = {
  scans: [],
  updatedAt: new Date(0).toISOString(),
};

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readHistoryState(): Promise<ScanHistoryState> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as ScanHistoryState;
    return {
      scans: Array.isArray(parsed.scans) ? parsed.scans : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return EMPTY;
  }
}

async function writeHistoryState(state: ScanHistoryState): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    FILE,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

export async function appendScanSnapshot(snapshot: ClientScanSnapshot): Promise<void> {
  if (isPostgresConfigured()) {
    await dbQuery(
      `
      INSERT INTO cert_scan_history
      (client_id, client_name, source, scanned_at, active_ids, flagged_active_ids)
      VALUES ($1, $2, $3, $4::timestamptz, $5::jsonb, $6::jsonb)
    `,
      [
        snapshot.clientId,
        snapshot.clientName,
        snapshot.source,
        snapshot.scannedAt,
        JSON.stringify(snapshot.activeIds ?? []),
        JSON.stringify(snapshot.flaggedActiveIds ?? []),
      ]
    );
    return;
  }

  const current = await readHistoryState();
  const next: ScanHistoryState = {
    ...current,
    scans: [snapshot, ...current.scans].slice(0, 1000),
  };
  await writeHistoryState(next);
}

export async function getClientScanHistory(clientId: string, limit = 20): Promise<ClientScanSnapshot[]> {
  if (isPostgresConfigured()) {
    const result = await dbQuery<{
      client_id: string;
      client_name: string;
      source: "manual" | "automation";
      scanned_at: string;
      active_ids: string[];
      flagged_active_ids: string[];
    }>(
      `
      SELECT client_id, client_name, source, scanned_at, active_ids, flagged_active_ids
      FROM cert_scan_history
      WHERE client_id = $1
      ORDER BY scanned_at DESC
      LIMIT $2
    `,
      [clientId, Math.max(1, limit)]
    );
    return result.rows.map((row: {
      client_id: string;
      client_name: string;
      source: "manual" | "automation";
      scanned_at: string;
      active_ids: string[];
      flagged_active_ids: string[];
    }) => ({
      clientId: row.client_id,
      clientName: row.client_name,
      source: row.source,
      scannedAt: row.scanned_at,
      activeIds: Array.isArray(row.active_ids) ? row.active_ids : [],
      flaggedActiveIds: Array.isArray(row.flagged_active_ids) ? row.flagged_active_ids : [],
    }));
  }

  const current = await readHistoryState();
  return current.scans.filter((s) => s.clientId === clientId).slice(0, Math.max(1, limit));
}
