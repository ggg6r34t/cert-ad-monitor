import { analyzeAd } from "@/lib/analysis";
import type { Client, MetaAd } from "@/types";
import { fetchAdsFromMeta } from "@/lib/server/metaAds";
import { logger } from "@/lib/server/logger";
import { configuredChannels, sendAlert } from "@/lib/server/notifier";
import {
  acquireAutomationRunLock,
  appendAutomationRun,
  heartbeatAutomationRunLock,
  releaseAutomationRunLock,
  readAutomationState,
  writeAutomationState,
  type AlertPolicy,
  type AutomationState,
  type ClientAutomationState,
  type AutomationRuntimeConfig,
} from "@/lib/server/automationStore";
import { readState } from "@/lib/server/stateStore";
import { scanQueue } from "@/lib/server/scanQueue";
import { ensureSchedulerLease } from "@/lib/server/automationLease";
import { getMetaToken } from "@/lib/server/metaTokenStore";
import { buildClientQueries } from "@/lib/brandQueries";
import { appendScanSnapshot } from "@/lib/server/scanHistoryStore";

const DEFAULT_INTERVAL_MINUTES = 30;
const DEFAULT_MAX_PAGES = 3;
const DEFAULT_MAX_QUERIES = 8;

export interface ClientRunResult {
  clientId: string;
  clientName: string;
  scanned: number;
  active: number;
  flaggedActive: number;
  activeIds: string[];
  flaggedActiveIds: string[];
  newFlaggedIds: string[];
  notificationSent: boolean;
}

export interface AutomationRunResult {
  startedAt: string;
  finishedAt: string;
  clients: ClientRunResult[];
}

interface RuntimeState {
  running: boolean;
  timerId: NodeJS.Timeout | null;
  leaseTimerId: NodeJS.Timeout | null;
  intervalMinutes: number;
  ownerId: string;
  leader: boolean;
  lastRun: AutomationRunResult | null;
}

const runtime: RuntimeState = {
  running: false,
  timerId: null,
  leaseTimerId: null,
  intervalMinutes: DEFAULT_INTERVAL_MINUTES,
  ownerId: `node-${process.pid}-${Math.random().toString(36).slice(2, 8)}`,
  leader: false,
  lastRun: null,
};

const LEASE_MS = 90_000;
const LEASE_RENEW_MS = 20_000;

function envRuntimeConfig(): AutomationRuntimeConfig {
  return {
    enabled: process.env.AUTO_SCAN_ENABLED === "true",
    intervalMinutes: Math.max(1, Number(process.env.AUTO_SCAN_INTERVAL_MINUTES ?? DEFAULT_INTERVAL_MINUTES)),
    maxPages: Math.max(1, Number(process.env.AUTO_SCAN_MAX_PAGES ?? DEFAULT_MAX_PAGES)),
    maxQueries: Math.max(1, Number(process.env.AUTO_SCAN_MAX_QUERIES ?? DEFAULT_MAX_QUERIES)),
  };
}

function effectiveRuntimeConfig(state?: AutomationState): AutomationRuntimeConfig {
  const env = envRuntimeConfig();
  const raw = state?.runtimeConfig;
  return {
    enabled: env.enabled && Boolean(raw?.enabled ?? env.enabled),
    intervalMinutes: Math.min(360, Math.max(1, Number(raw?.intervalMinutes ?? env.intervalMinutes))),
    maxPages: Math.min(10, Math.max(1, Number(raw?.maxPages ?? env.maxPages))),
    maxQueries: Math.min(25, Math.max(1, Number(raw?.maxQueries ?? env.maxQueries))),
  };
}

function startRunTimer(): void {
  if (runtime.timerId) return;
  runtime.timerId = setInterval(() => {
    if (!runtime.leader) return;
    void runAutomationCycle("scheduled");
  }, runtime.intervalMinutes * 60 * 1000);
}

function stopRunTimer(): void {
  if (!runtime.timerId) return;
  clearInterval(runtime.timerId);
  runtime.timerId = null;
}

function toMetaAds(items: Array<Record<string, unknown>>): MetaAd[] {
  return items as unknown as MetaAd[];
}

function getFlaggedActiveIds(client: Client, ads: MetaAd[]): string[] {
  return ads
    .filter((ad) => !ad.ad_delivery_stop_time)
    .filter((ad) => analyzeAd(ad, client).score > 0)
    .map((ad) => ad.id);
}

function unique<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

async function runClientScan(
  client: Client,
  token: string,
  state: AutomationState,
  runtimeConfig: AutomationRuntimeConfig
): Promise<ClientRunResult> {
  const queries = buildClientQueries(
    client.name,
    client.brandTerms,
    runtimeConfig.maxQueries
  );
  const dedup = new Map<string, MetaAd>();
  for (const query of queries) {
    const result = await fetchAdsFromMeta({
      query,
      country: client.country,
      maxPages: runtimeConfig.maxPages,
      token,
    });
    for (const ad of toMetaAds(result.ads)) {
      dedup.set(ad.id, ad);
    }
  }

  const ads = Array.from(dedup.values());
  const activeCount = ads.filter((ad) => !ad.ad_delivery_stop_time).length;
  const flaggedActiveIds = unique(getFlaggedActiveIds(client, ads));
  const previous = state.clients[client.id];
  const previousIds = new Set(previous?.lastFlaggedActiveIds ?? []);
  const newFlaggedIds = flaggedActiveIds.filter((id) => !previousIds.has(id));

  const policy = state.alertPolicy;
  const minNewFlaggedForAlert = Math.max(1, Number(policy?.minNewFlaggedForAlert ?? 1));
  const shouldSendByThreshold = newFlaggedIds.length >= minNewFlaggedForAlert;
  const shouldSendByQuietHours = !isWithinQuietHours(policy);

  let notificationSent = false;
  if (newFlaggedIds.length > 0 && shouldSendByThreshold && shouldSendByQuietHours) {
    const lines = [
      `Client: ${client.name}`,
      `Country: ${client.country}`,
      `New flagged active ads: ${newFlaggedIds.length}`,
      `Total flagged active ads: ${flaggedActiveIds.length}`,
      ...newFlaggedIds.slice(0, 5).map((id) => `- https://www.facebook.com/ads/library/?id=${id}`),
    ];
    const results = await sendAlert("[CERT] New active flagged ads detected", lines, {
      channels: policy?.channels,
    });
    notificationSent = results.some((r) => r.success);
  }

  const nextFlaggedIds = newFlaggedIds.length > 0 && !notificationSent
    ? previous?.lastFlaggedActiveIds ?? []
    : flaggedActiveIds;

  const nextClientState: ClientAutomationState = {
    lastRunAt: new Date().toISOString(),
    lastActiveCount: activeCount,
    lastFlaggedActiveCount: flaggedActiveIds.length,
    lastFlaggedActiveIds: nextFlaggedIds,
  };
  state.clients[client.id] = nextClientState;

  return {
    clientId: client.id,
    clientName: client.name,
    scanned: ads.length,
    active: activeCount,
    flaggedActive: flaggedActiveIds.length,
    activeIds: ads.filter((ad) => !ad.ad_delivery_stop_time).map((ad) => ad.id),
    flaggedActiveIds,
    newFlaggedIds,
    notificationSent,
  };
}

function isWithinQuietHours(policy?: AlertPolicy): boolean {
  if (!policy?.quietHoursUtc?.enabled) return false;
  const start = policy.quietHoursUtc.startHour;
  const end = policy.quietHoursUtc.endHour;
  const nowHour = new Date().getUTCHours();
  if (start === end) return true;
  if (start < end) return nowHour >= start && nowHour < end;
  return nowHour >= start || nowHour < end;
}

export async function runAutomationCycle(trigger: "manual" | "scheduled" = "manual"): Promise<AutomationRunResult | null> {
  if (runtime.running) {
    logger.warn("Skipping automation cycle because one is already running", { trigger });
    return null;
  }
  const lock = await acquireAutomationRunLock(runtime.ownerId, trigger);
  if (!lock.acquired) {
    logger.warn("Skipping automation cycle because persisted lock is held", {
      trigger,
      lockOwner: lock.state.lock?.ownerId,
      lockHeartbeat: lock.state.lock?.heartbeatAt,
    });
    return null;
  }
  runtime.running = true;
  const startedAt = new Date().toISOString();

  try {
    const token = await getMetaToken();
    if (!token) {
      logger.warn("Automation skipped because META_AD_LIBRARY_TOKEN is missing");
      return null;
    }

    const persisted = await readState();
    const clients = persisted.clients ?? [];
    if (clients.length === 0) {
      logger.info("Automation cycle found no clients");
      return {
        startedAt,
        finishedAt: new Date().toISOString(),
        clients: [],
      };
    }

    const automationState = await readAutomationState();
    const runtimeConfig = effectiveRuntimeConfig(automationState);
    const outputs: ClientRunResult[] = [];
    const errors: string[] = [];
    for (const client of clients) {
      try {
        await heartbeatAutomationRunLock(runtime.ownerId);
        const output = await scanQueue.enqueue(
          () => runClientScan(client, token, automationState, runtimeConfig),
          trigger === "manual" ? "high" : "normal"
        );
        outputs.push(output);
        await appendScanSnapshot({
          clientId: output.clientId,
          clientName: output.clientName,
          source: "automation",
          scannedAt: new Date().toISOString(),
          activeIds: output.activeIds,
          flaggedActiveIds: output.flaggedActiveIds,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown client automation error";
        errors.push(`${client.name}: ${message}`);
        logger.error("Client automation run failed", { clientId: client.id, clientName: client.name, message });
      }
    }
    await writeAutomationState(automationState);

    const finishedAt = new Date().toISOString();
    const finalResult: AutomationRunResult = { startedAt, finishedAt, clients: outputs };
    runtime.lastRun = finalResult;
    await appendAutomationRun({
      startedAt,
      finishedAt,
      clientsScanned: outputs.length,
      failures: errors.length,
      activeTotal: outputs.reduce((sum, c) => sum + c.active, 0),
      flaggedTotal: outputs.reduce((sum, c) => sum + c.flaggedActive, 0),
      newFlaggedTotal: outputs.reduce((sum, c) => sum + c.newFlaggedIds.length, 0),
    });
    logger.info("Automation cycle completed", {
      trigger,
      clients: outputs.length,
      failures: errors.length,
      flagged: outputs.reduce((sum, c) => sum + c.flaggedActive, 0),
      newFlagged: outputs.reduce((sum, c) => sum + c.newFlaggedIds.length, 0),
      channelsConfigured: configuredChannels(),
    });
    return finalResult;
  } catch (err) {
    logger.error("Automation cycle failed", {
      trigger,
      message: err instanceof Error ? err.message : "Unknown automation error",
    });
    throw err;
  } finally {
    await releaseAutomationRunLock(runtime.ownerId);
    runtime.running = false;
  }
}

export function startAutomationScheduler(): void {
  if (!envRuntimeConfig().enabled) return;

  if (runtime.leaseTimerId) return;

  const tick = async () => {
    const state = await readAutomationState();
    const runtimeConfig = effectiveRuntimeConfig(state);
    if (runtime.intervalMinutes !== runtimeConfig.intervalMinutes) {
      runtime.intervalMinutes = runtimeConfig.intervalMinutes;
      if (runtime.leader) {
        stopRunTimer();
        startRunTimer();
      }
    }
    if (!runtimeConfig.enabled) {
      if (runtime.leader) {
        runtime.leader = false;
        stopRunTimer();
        logger.warn("Automation scheduler disabled by runtime override", { ownerId: runtime.ownerId });
      }
      return;
    }
    const hasLease = await ensureSchedulerLease(runtime.ownerId, LEASE_MS);
    if (hasLease && !runtime.leader) {
      runtime.leader = true;
      startRunTimer();
      logger.info("Automation node became leader", {
        ownerId: runtime.ownerId,
        intervalMinutes: runtime.intervalMinutes,
      });
      setTimeout(() => {
        if (runtime.leader) void runAutomationCycle("scheduled");
      }, 10_000);
      return;
    }
    if (!hasLease && runtime.leader) {
      runtime.leader = false;
      stopRunTimer();
      logger.warn("Automation node lost leader lease", { ownerId: runtime.ownerId });
    }
  };

  runtime.leaseTimerId = setInterval(() => {
    void tick();
  }, LEASE_RENEW_MS);
  void tick();

  logger.info("Automation scheduler lease loop started", {
    ownerId: runtime.ownerId,
    intervalMinutes: runtime.intervalMinutes,
    leaseRenewMs: LEASE_RENEW_MS,
  });
}

export function getAutomationRuntimeStatus(state?: AutomationState): {
  enabled: boolean;
  leader: boolean;
  ownerId: string;
  running: boolean;
  intervalMinutes: number;
  maxPages: number;
  maxQueries: number;
  schedulerAllowedByEnv: boolean;
  queueSize: number;
  queue: {
    concurrency: number;
    minIntervalMs: number;
    running: number;
    queuedHigh: number;
    queuedNormal: number;
  };
  lastRun: AutomationRunResult | null;
} {
  const config = effectiveRuntimeConfig(state);
  return {
    enabled: config.enabled,
    leader: runtime.leader,
    ownerId: runtime.ownerId,
    running: runtime.running,
    intervalMinutes: config.intervalMinutes,
    maxPages: config.maxPages,
    maxQueries: config.maxQueries,
    schedulerAllowedByEnv: envRuntimeConfig().enabled,
    queueSize: scanQueue.size,
    queue: scanQueue.status,
    lastRun: runtime.lastRun,
  };
}
