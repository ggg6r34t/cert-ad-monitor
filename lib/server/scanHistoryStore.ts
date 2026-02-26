import { promises as fs } from "node:fs";
import path from "node:path";

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
  const current = await readHistoryState();
  const next: ScanHistoryState = {
    ...current,
    scans: [snapshot, ...current.scans].slice(0, 1000),
  };
  await writeHistoryState(next);
}

export async function getClientScanHistory(clientId: string, limit = 20): Promise<ClientScanSnapshot[]> {
  const current = await readHistoryState();
  return current.scans.filter((s) => s.clientId === clientId).slice(0, Math.max(1, limit));
}

