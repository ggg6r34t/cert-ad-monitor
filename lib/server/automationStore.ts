import { promises as fs } from "node:fs";
import path from "node:path";

export interface ClientAutomationState {
  lastRunAt: string;
  lastActiveCount: number;
  lastFlaggedActiveCount: number;
  lastFlaggedActiveIds: string[];
}

export interface AutomationState {
  clients: Record<string, ClientAutomationState>;
  runs: AutomationRunSnapshot[];
  lock?: AutomationRunLock | null;
  alertPolicy?: AlertPolicy;
  updatedAt: string;
}

export interface AutomationRunSnapshot {
  startedAt: string;
  finishedAt: string;
  clientsScanned: number;
  failures: number;
  activeTotal: number;
  flaggedTotal: number;
  newFlaggedTotal: number;
}

export interface AutomationRunLock {
  ownerId: string;
  trigger: "manual" | "scheduled";
  startedAt: string;
  heartbeatAt: string;
}

export interface AlertPolicy {
  channels: {
    slack: boolean;
    telegram: boolean;
  };
  minNewFlaggedForAlert: number;
  quietHoursUtc: {
    enabled: boolean;
    startHour: number;
    endHour: number;
  };
}

const DATA_DIR = process.env.APP_DATA_DIR
  ? path.resolve(process.env.APP_DATA_DIR)
  : path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "automation-state.json");

const EMPTY_STATE: AutomationState = {
  clients: {},
  runs: [],
  lock: null,
  alertPolicy: {
    channels: { slack: true, telegram: true },
    minNewFlaggedForAlert: 1,
    quietHoursUtc: {
      enabled: false,
      startHour: 0,
      endHour: 6,
    },
  },
  updatedAt: new Date(0).toISOString(),
};

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

export async function readAutomationState(): Promise<AutomationState> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as AutomationState;
    return {
      clients: parsed.clients ?? {},
      runs: Array.isArray(parsed.runs) ? parsed.runs : [],
      lock:
        parsed.lock && typeof parsed.lock === "object"
          ? {
              ownerId: String(parsed.lock.ownerId ?? ""),
              trigger: parsed.lock.trigger === "scheduled" ? "scheduled" : "manual",
              startedAt: String(parsed.lock.startedAt ?? ""),
              heartbeatAt: String(parsed.lock.heartbeatAt ?? ""),
            }
          : null,
      alertPolicy: {
        channels: {
          slack: parsed.alertPolicy?.channels?.slack !== false,
          telegram: parsed.alertPolicy?.channels?.telegram !== false,
        },
        minNewFlaggedForAlert: Math.max(
          1,
          Number(parsed.alertPolicy?.minNewFlaggedForAlert ?? EMPTY_STATE.alertPolicy!.minNewFlaggedForAlert)
        ),
        quietHoursUtc: {
          enabled: Boolean(parsed.alertPolicy?.quietHoursUtc?.enabled),
          startHour: Math.min(23, Math.max(0, Number(parsed.alertPolicy?.quietHoursUtc?.startHour ?? 0))),
          endHour: Math.min(23, Math.max(0, Number(parsed.alertPolicy?.quietHoursUtc?.endHour ?? 6))),
        },
      },
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return EMPTY_STATE;
  }
}

export async function writeAutomationState(state: AutomationState): Promise<void> {
  await ensureDir();
  await fs.writeFile(
    FILE,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2),
    "utf8"
  );
}

export async function appendAutomationRun(run: AutomationRunSnapshot): Promise<void> {
  const state = await readAutomationState();
  const next: AutomationState = {
    ...state,
    runs: [run, ...state.runs].slice(0, 100),
  };
  await writeAutomationState(next);
}

export async function acquireAutomationRunLock(
  ownerId: string,
  trigger: "manual" | "scheduled",
  staleAfterMs = 5 * 60 * 1000
): Promise<{ acquired: boolean; state: AutomationState }> {
  const state = await readAutomationState();
  const now = Date.now();
  const lockTs = state.lock?.heartbeatAt ? new Date(state.lock.heartbeatAt).getTime() : 0;
  const stale = !state.lock || !lockTs || now - lockTs > staleAfterMs;
  if (!state.lock || stale || state.lock.ownerId === ownerId) {
    const next: AutomationState = {
      ...state,
      lock: {
        ownerId,
        trigger,
        startedAt: state.lock?.startedAt && !stale ? state.lock.startedAt : new Date().toISOString(),
        heartbeatAt: new Date().toISOString(),
      },
    };
    await writeAutomationState(next);
    return { acquired: true, state: next };
  }
  return { acquired: false, state };
}

export async function heartbeatAutomationRunLock(ownerId: string): Promise<void> {
  const state = await readAutomationState();
  if (!state.lock || state.lock.ownerId !== ownerId) return;
  await writeAutomationState({
    ...state,
    lock: {
      ...state.lock,
      heartbeatAt: new Date().toISOString(),
    },
  });
}

export async function releaseAutomationRunLock(ownerId: string): Promise<void> {
  const state = await readAutomationState();
  if (!state.lock || state.lock.ownerId !== ownerId) return;
  await writeAutomationState({
    ...state,
    lock: null,
  });
}
