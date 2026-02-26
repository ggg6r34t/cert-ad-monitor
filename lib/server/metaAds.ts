import { logger } from "@/lib/server/logger";

const META_API_BASE = "https://graph.facebook.com/v19.0/ads_archive";
const REQUEST_TIMEOUT_MS = 12_000;
const MAX_RETRIES = 2;
const DEFAULT_MAX_PAGES = 3;
const HARD_MAX_PAGES = 10;
const PAGE_LIMIT = 75;
const BREAKER_FAILURE_THRESHOLD = Math.max(
  2,
  Number(process.env.META_CIRCUIT_BREAKER_FAILURES ?? 5)
);
const BREAKER_COOLDOWN_MS = Math.max(
  15_000,
  Number(process.env.META_CIRCUIT_BREAKER_COOLDOWN_MS ?? 90_000)
);

const AD_FIELDS = [
  "id",
  "ad_creation_time",
  "ad_creative_bodies",
  "ad_creative_link_captions",
  "ad_creative_link_titles",
  "ad_creative_link_descriptions",
  "ad_delivery_start_time",
  "ad_delivery_stop_time",
  "page_id",
  "page_name",
  "publisher_platforms",
  "impressions",
  "spend",
].join(",");

const ERROR_GUIDANCE: Record<number, string> = {
  190: "Token expired or invalid. Regenerate at facebook.com/ads/library/api.",
  100: "Invalid query or country. Verify scan parameters.",
  4: "Meta rate limit reached. Retry in a few minutes.",
  10: "Account does not have Ad Library API permission.",
  200: "Account does not have Ad Library API permission.",
};

interface MetaPageResponse {
  data?: Array<Record<string, unknown>>;
  paging?: {
    next?: string;
  };
  error?: {
    message?: string;
    code?: number;
  };
}

export class MetaApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

interface CircuitBreakerState {
  consecutiveFailures: number;
  openUntil: number;
  lastFailureAt?: number;
}

const breakerState: CircuitBreakerState = {
  consecutiveFailures: 0,
  openUntil: 0,
};

export function getMetaCircuitBreakerStatus(): {
  open: boolean;
  consecutiveFailures: number;
  openUntil: string | null;
} {
  return {
    open: Date.now() < breakerState.openUntil,
    consecutiveFailures: breakerState.consecutiveFailures,
    openUntil: breakerState.openUntil > 0 ? new Date(breakerState.openUntil).toISOString() : null,
  };
}

export interface FetchAdsOptions {
  query: string;
  country?: string;
  maxPages?: number;
  token: string;
}

export interface FetchAdsResult {
  ads: Array<Record<string, unknown>>;
  meta: {
    pagesFetched: number;
    truncated: boolean;
    pageLimit: number;
    maxPages: number;
  };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(signal?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  controller.signal.addEventListener("abort", () => clearTimeout(timeout), { once: true });
  return controller.signal;
}

async function fetchMetaJson(url: string): Promise<{ response: Response; data: MetaPageResponse }> {
  if (Date.now() < breakerState.openUntil) {
    const retryAfterSec = Math.max(1, Math.ceil((breakerState.openUntil - Date.now()) / 1000));
    throw new MetaApiError(
      `Meta circuit breaker is open after repeated failures. Retry in ~${retryAfterSec}s.`,
      503
    );
  }

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt <= MAX_RETRIES) {
    try {
      const response = await fetch(url, {
        cache: "no-store",
        signal: withTimeout(),
      });
      const contentType = response.headers.get("content-type") ?? "";

      if (!contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(`Non-JSON response from Meta (status ${response.status}): ${text.slice(0, 200)}`);
      }

      const data = (await response.json()) as MetaPageResponse;

      if (!response.ok && response.status >= 500 && attempt < MAX_RETRIES) {
        attempt += 1;
        await wait(250 * attempt);
        continue;
      }

      if (response.ok) {
        breakerState.consecutiveFailures = 0;
        breakerState.openUntil = 0;
      } else if (response.status >= 500 || response.status === 429) {
        breakerState.consecutiveFailures += 1;
        breakerState.lastFailureAt = Date.now();
      }

      return { response, data };
    } catch (err) {
      lastError = err;
      if (attempt >= MAX_RETRIES) break;
      attempt += 1;
      await wait(250 * attempt);
    }
  }

  breakerState.consecutiveFailures += 1;
  breakerState.lastFailureAt = Date.now();
  if (breakerState.consecutiveFailures >= BREAKER_FAILURE_THRESHOLD) {
    breakerState.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
    logger.warn("Meta circuit breaker opened", {
      failures: breakerState.consecutiveFailures,
      cooldownMs: BREAKER_COOLDOWN_MS,
    });
  }

  throw lastError instanceof Error ? lastError : new Error("Unknown Meta fetch error");
}

function buildInitialUrl(query: string, country: string, token: string): string {
  return (
    `${META_API_BASE}` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&ad_reached_countries=${encodeURIComponent(country)}` +
    `&ad_active_status=ALL` +
    `&fields=${encodeURIComponent(AD_FIELDS)}` +
    `&limit=${PAGE_LIMIT}` +
    `&access_token=${encodeURIComponent(token)}`
  );
}

function cleanMetaNextUrl(nextUrl: string, token: string): string {
  const parsed = new URL(nextUrl);
  parsed.searchParams.set("access_token", token);
  parsed.searchParams.set("fields", AD_FIELDS);
  parsed.searchParams.set("limit", String(PAGE_LIMIT));
  return parsed.toString();
}

export async function fetchAdsFromMeta({
  query,
  country = "ALL",
  maxPages = DEFAULT_MAX_PAGES,
  token,
}: FetchAdsOptions): Promise<FetchAdsResult> {
  const normalizedQuery = query.trim();
  const normalizedCountry = country.trim().toUpperCase() || "ALL";
  const boundedMaxPages = Math.min(Math.max(maxPages, 1), HARD_MAX_PAGES);

  if (!normalizedQuery) {
    throw new MetaApiError("Missing required field: q", 400);
  }
  if (!token.trim()) {
    throw new MetaApiError("Server token is not configured.", 503);
  }

  const dedup = new Map<string, Record<string, unknown>>();
  let pagesFetched = 0;
  let nextUrl: string | undefined = buildInitialUrl(normalizedQuery, normalizedCountry, token);
  let truncated = false;

  while (nextUrl && pagesFetched < boundedMaxPages) {
    const { response, data } = await fetchMetaJson(nextUrl);
    pagesFetched += 1;

    if (!response.ok) {
      const errMsg = data.error?.message ?? `Meta API error (HTTP ${response.status})`;
      const errCode = data.error?.code ?? 0;
      const guidance = ERROR_GUIDANCE[errCode] ?? "";
      logger.warn("Meta API returned non-OK response", {
        httpStatus: response.status,
        metaCode: errCode,
        query: normalizedQuery,
        country: normalizedCountry,
      });
      throw new MetaApiError(guidance ? `${errMsg}\n\n${guidance}` : errMsg, response.status);
    }

    for (const item of data.data ?? []) {
      const id = typeof item.id === "string" ? item.id : undefined;
      if (!id) continue;
      dedup.set(id, item);
    }

    const next = data.paging?.next;
    nextUrl = next ? cleanMetaNextUrl(next, token) : undefined;
  }

  if (nextUrl) truncated = true;

  return {
    ads: Array.from(dedup.values()),
    meta: {
      pagesFetched,
      truncated,
      pageLimit: PAGE_LIMIT,
      maxPages: boundedMaxPages,
    },
  };
}
