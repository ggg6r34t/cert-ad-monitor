import { NextResponse } from "next/server";
import { logger } from "@/lib/server/logger";
import { fetchAdsFromMeta, MetaApiError } from "@/lib/server/metaAds";
import { getMetaToken } from "@/lib/server/metaTokenStore";
import { maybeRequireInternalApiKey } from "@/lib/server/internalGuard";

interface ScanRequestBody {
  q?: string;
  country?: string;
  maxPages?: number;
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const message = (err as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return typeof err === "string" && err.trim() ? err : "Unknown error";
}

export async function POST(request: Request) {
  const guard = maybeRequireInternalApiKey(request);
  if (guard) return guard;

  const token = await getMetaToken();
  if (!token) {
    return NextResponse.json(
      { error: "Server token is not configured. Set META_AD_LIBRARY_TOKEN in environment." },
      { status: 503 }
    );
  }

  let body: ScanRequestBody;
  try {
    body = (await request.json()) as ScanRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = body.q?.trim();
  const country = (body.country?.trim() || "ALL").toUpperCase();
  try {
    const result = await fetchAdsFromMeta({
      query: query ?? "",
      country,
      maxPages: body.maxPages,
      token,
    });

    logger.info("Meta scan completed", {
      query,
      country,
      pagesFetched: result.meta.pagesFetched,
      adsReturned: result.ads.length,
      truncated: result.meta.truncated,
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MetaApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = getErrorMessage(err);
    logger.error("Meta scan failed", { query, country, message });
    return NextResponse.json(
      { error: `Could not reach Meta API: ${message}` },
      { status: 502 }
    );
  }
}
