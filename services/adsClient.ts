import type { FetchAdsResult } from "@/types";
import { generateDemoData } from "@/lib/demo-data";
import { withInternalApiKey } from "@/services/internalApi";

interface FetchAdsInput {
  query: string;
  country: string;
  allowDemo: boolean;
  maxPages?: number;
}

export async function fetchAds({
  query,
  country,
  allowDemo,
  maxPages = 3,
}: FetchAdsInput): Promise<FetchAdsResult> {
  if (allowDemo) {
    return generateDemoData(query);
  }

  try {
    const res = await fetch("/api/ads", {
      method: "POST",
      headers: withInternalApiKey({ "Content-Type": "application/json" }),
      body: JSON.stringify({ q: query, country, maxPages }),
    });

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { ads: [], error: `Unexpected response (status ${res.status})`, isDemo: false };
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? `HTTP ${res.status}`);
    }

    return { ads: data.ads ?? [], error: null, isDemo: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ads: [], error: msg, isDemo: false };
  }
}
