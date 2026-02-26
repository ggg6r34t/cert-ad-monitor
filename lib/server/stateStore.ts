import { promises as fs } from "node:fs";
import path from "node:path";
import type { Client, TriageStatus } from "@/types";
import { dbQuery, isPostgresConfigured, withDbClient } from "@/lib/server/db";

export interface PersistedState {
  clients: Client[];
  triageMap: Record<string, TriageStatus>;
  version: number;
  updatedAt: string;
}

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : path.join(process.cwd(), "data");
const STATE_FILE = path.join(DATA_DIR, "state.json");

const EMPTY_STATE: PersistedState = {
  clients: [],
  triageMap: {},
  version: 0,
  updatedAt: new Date(0).toISOString(),
};

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function sanitizeState(input: unknown): PersistedState {
  if (!input || typeof input !== "object") return EMPTY_STATE;
  const raw = input as Partial<PersistedState>;
  const clients = Array.isArray(raw.clients) ? raw.clients : [];
  const triageMap =
    raw.triageMap && typeof raw.triageMap === "object" ? raw.triageMap : {};
  return {
    clients,
    triageMap: triageMap as Record<string, TriageStatus>,
    version: typeof raw.version === "number" ? raw.version : 0,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
  };
}

export async function readState(): Promise<PersistedState> {
  if (isPostgresConfigured()) {
    const result = await dbQuery<{
      clients: Client[];
      triage_map: Record<string, TriageStatus>;
      version: number;
      updated_at: string;
    }>("SELECT clients, triage_map, version, updated_at FROM cert_state WHERE id = 1");
    if (result.rows.length === 0) return EMPTY_STATE;
    const row = result.rows[0];
    return sanitizeState({
      clients: row.clients,
      triageMap: row.triage_map,
      version: row.version,
      updatedAt: row.updated_at,
    });
  }
  try {
    const raw = await fs.readFile(STATE_FILE, "utf8");
    return sanitizeState(JSON.parse(raw));
  } catch {
    return EMPTY_STATE;
  }
}

export class StateConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateConflictError";
  }
}

interface WriteStateInput {
  clients: Client[];
  triageMap: Record<string, TriageStatus>;
  expectedVersion?: number;
}

export async function writeState(nextState: WriteStateInput): Promise<PersistedState> {
  if (isPostgresConfigured()) {
    const clients = Array.isArray(nextState.clients) ? nextState.clients : [];
    const triageMap =
      nextState.triageMap && typeof nextState.triageMap === "object" ? nextState.triageMap : {};

    if (typeof nextState.expectedVersion === "number") {
      const update = await dbQuery<{
        clients: Client[];
        triage_map: Record<string, TriageStatus>;
        version: number;
        updated_at: string;
      }>(
        `
        UPDATE cert_state
        SET clients = $1::jsonb,
            triage_map = $2::jsonb,
            version = version + 1,
            updated_at = NOW()
        WHERE id = 1 AND version = $3
        RETURNING clients, triage_map, version, updated_at
      `,
        [JSON.stringify(clients), JSON.stringify(triageMap), nextState.expectedVersion]
      );

      if (update.rows.length > 0) {
        const row = update.rows[0];
        return sanitizeState({
          clients: row.clients,
          triageMap: row.triage_map,
          version: row.version,
          updatedAt: row.updated_at,
        });
      }

      if (nextState.expectedVersion === 0) {
        const inserted = await dbQuery<{
          clients: Client[];
          triage_map: Record<string, TriageStatus>;
          version: number;
          updated_at: string;
        }>(
          `
          INSERT INTO cert_state (id, clients, triage_map, version, updated_at)
          VALUES (1, $1::jsonb, $2::jsonb, 1, NOW())
          ON CONFLICT (id) DO NOTHING
          RETURNING clients, triage_map, version, updated_at
        `,
          [JSON.stringify(clients), JSON.stringify(triageMap)]
        );
        if (inserted.rows.length > 0) {
          const row = inserted.rows[0];
          return sanitizeState({
            clients: row.clients,
            triageMap: row.triage_map,
            version: row.version,
            updatedAt: row.updated_at,
          });
        }
      }

      const current = await readState();
      throw new StateConflictError(
        `Version conflict. Expected ${nextState.expectedVersion}, current ${current.version}.`
      );
    }

    const upsert = await dbQuery<{
      clients: Client[];
      triage_map: Record<string, TriageStatus>;
      version: number;
      updated_at: string;
    }>(
      `
      INSERT INTO cert_state (id, clients, triage_map, version, updated_at)
      VALUES (1, $1::jsonb, $2::jsonb, 1, NOW())
      ON CONFLICT (id) DO UPDATE
      SET clients = EXCLUDED.clients,
          triage_map = EXCLUDED.triage_map,
          version = cert_state.version + 1,
          updated_at = NOW()
      RETURNING clients, triage_map, version, updated_at
    `,
      [JSON.stringify(clients), JSON.stringify(triageMap)]
    );
    const row = upsert.rows[0];
    return sanitizeState({
      clients: row.clients,
      triageMap: row.triage_map,
      version: row.version,
      updatedAt: row.updated_at,
    });
  }

  await ensureDataDir();
  const current = await readState();
  if (
    typeof nextState.expectedVersion === "number" &&
    nextState.expectedVersion !== current.version
  ) {
    throw new StateConflictError(
      `Version conflict. Expected ${nextState.expectedVersion}, current ${current.version}.`
    );
  }
  const payload: PersistedState = {
    clients: Array.isArray(nextState.clients) ? nextState.clients : [],
    triageMap:
      nextState.triageMap && typeof nextState.triageMap === "object"
        ? nextState.triageMap
        : {},
    version: current.version + 1,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export async function replaceState(nextState: {
  clients: Client[];
  triageMap: Record<string, TriageStatus>;
  version?: number;
}): Promise<PersistedState> {
  if (isPostgresConfigured()) {
    const version = typeof nextState.version === "number" ? Math.max(0, nextState.version) : 0;
    const res = await dbQuery<{
      clients: Client[];
      triage_map: Record<string, TriageStatus>;
      version: number;
      updated_at: string;
    }>(
      `
      INSERT INTO cert_state (id, clients, triage_map, version, updated_at)
      VALUES (1, $1::jsonb, $2::jsonb, $3, NOW())
      ON CONFLICT (id) DO UPDATE
      SET clients = EXCLUDED.clients,
          triage_map = EXCLUDED.triage_map,
          version = EXCLUDED.version,
          updated_at = NOW()
      RETURNING clients, triage_map, version, updated_at
    `,
      [JSON.stringify(nextState.clients ?? []), JSON.stringify(nextState.triageMap ?? {}), version]
    );
    const row = res.rows[0];
    return sanitizeState({
      clients: row.clients,
      triageMap: row.triage_map,
      version: row.version,
      updatedAt: row.updated_at,
    });
  }

  await ensureDataDir();
  const payload: PersistedState = {
    clients: Array.isArray(nextState.clients) ? nextState.clients : [],
    triageMap:
      nextState.triageMap && typeof nextState.triageMap === "object"
        ? nextState.triageMap
        : {},
    version: typeof nextState.version === "number" ? Math.max(0, nextState.version) : 0,
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(STATE_FILE, JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

export async function stateStoreHealth(): Promise<{ ok: boolean; path: string; error?: string }> {
  if (isPostgresConfigured()) {
    try {
      await withDbClient(async (client) => {
        await client.query("SELECT 1");
      });
      return { ok: true, path: "postgres://cert_state" };
    } catch (err) {
      return {
        ok: false,
        path: "postgres://cert_state",
        error: err instanceof Error ? err.message : "Unknown datastore error",
      };
    }
  }

  try {
    await ensureDataDir();
    await fs.access(DATA_DIR);
    return { ok: true, path: STATE_FILE };
  } catch (err) {
    return {
      ok: false,
      path: STATE_FILE,
      error: err instanceof Error ? err.message : "Unknown datastore error",
    };
  }
}
