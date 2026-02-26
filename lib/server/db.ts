import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;
let schemaInitPromise: Promise<void> | null = null;

function connectionString(): string | null {
  return process.env.POSTGRES_URL ?? process.env.DATABASE_URL ?? null;
}

export function isPostgresConfigured(): boolean {
  return Boolean(connectionString());
}

function getPool(): Pool {
  if (pool) return pool;
  const conn = connectionString();
  if (!conn) {
    throw new Error("POSTGRES_URL or DATABASE_URL is not configured.");
  }
  pool = new Pool({
    connectionString: conn,
    ssl: conn.includes("localhost") ? undefined : { rejectUnauthorized: false },
    max: 5,
  });
  return pool;
}

async function initSchema(): Promise<void> {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS cert_state (
      id SMALLINT PRIMARY KEY,
      clients JSONB NOT NULL DEFAULT '[]'::jsonb,
      triage_map JSONB NOT NULL DEFAULT '{}'::jsonb,
      version INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS cert_automation_state (
      id SMALLINT PRIMARY KEY,
      clients JSONB NOT NULL DEFAULT '{}'::jsonb,
      runs JSONB NOT NULL DEFAULT '[]'::jsonb,
      lock JSONB,
      alert_policy JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS cert_scan_history (
      id BIGSERIAL PRIMARY KEY,
      client_id TEXT NOT NULL,
      client_name TEXT NOT NULL,
      source TEXT NOT NULL,
      scanned_at TIMESTAMPTZ NOT NULL,
      active_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
      flagged_active_ids JSONB NOT NULL DEFAULT '[]'::jsonb
    );
  `);
  await p.query(`
    CREATE INDEX IF NOT EXISTS idx_cert_scan_history_client_scanned
    ON cert_scan_history (client_id, scanned_at DESC);
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS cert_meta_token (
      id SMALLINT PRIMARY KEY,
      payload JSONB,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await p.query(`
    CREATE TABLE IF NOT EXISTS cert_scheduler_lease (
      key TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function ensureSchema(): Promise<void> {
  if (!schemaInitPromise) {
    schemaInitPromise = initSchema().catch((err) => {
      schemaInitPromise = null;
      throw err;
    });
  }
  await schemaInitPromise;
}

export async function dbQuery<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  await ensureSchema();
  return getPool().query<T>(text, params);
}

export async function withDbClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
