import { promises as fs } from "node:fs";
import path from "node:path";
import type { Client, TriageStatus } from "@/types";

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
