import { NextRequest, NextResponse } from "next/server";

const META_API_BASE = "https://graph.facebook.com/v19.0/ads_archive";

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

// Common Meta API error codes → human-readable guidance
const ERROR_GUIDANCE: Record<number, string> = {
  190: "Your token has expired. Generate a new one at facebook.com/ads/library/api.",
  100: "Invalid parameter. Check that the search query and country code are valid.",
  4:   "Rate limit hit. Wait a few minutes before scanning again.",
  10:  "Your account lacks permission for the Ad Library API. Apply at facebook.com/ads/library/api.",
  200: "Your account lacks permission for the Ad Library API. Apply at facebook.com/ads/library/api.",
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = searchParams.get("q");
  const token = searchParams.get("token") ?? process.env.META_AD_LIBRARY_TOKEN;
  const country = searchParams.get("country") ?? "ALL";

  if (!query) {
    return NextResponse.json(
      { error: "Missing required parameter: q (search query)" },
      { status: 400 }
    );
  }

  if (!token) {
    return NextResponse.json(
      { error: "No API token provided. Set it in Settings or in .env.local as META_AD_LIBRARY_TOKEN." },
      { status: 401 }
    );
  }

  const url =
    `${META_API_BASE}` +
    `?search_terms=${encodeURIComponent(query)}` +
    `&ad_reached_countries=${encodeURIComponent(country)}` +
    `&ad_active_status=ALL` +
    `&fields=${AD_FIELDS}` +
    `&limit=75` +
    `&access_token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    const contentType = response.headers.get("content-type") ?? "";

    // Meta returns HTML when the token is invalid/expired
    if (!contentType.includes("application/json")) {
      const body = await response.text();
      console.error(
        `[META API] Non-JSON response (${response.status}). ` +
        `Content-Type: ${contentType}. Body preview: ${body.substring(0, 300)}`
      );

      const isAuthIssue =
        response.status === 400 ||
        response.status === 401 ||
        response.status === 403 ||
        body.includes("login") ||
        body.includes("OAuthException");

      if (isAuthIssue) {
        return NextResponse.json(
          {
            error:
              "Meta rejected the API token. It may be expired, invalid, or " +
              "your account may not have Ad Library API access.\n\n" +
              "Steps to fix:\n" +
              "1. Go to facebook.com/ads/library/api\n" +
              "2. Log in with a confirmed Facebook account\n" +
              "3. Generate a new User Access Token\n" +
              "4. Paste it in Settings",
          },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: `Meta returned unexpected response (status ${response.status}). Token may be invalid.` },
        { status: 502 }
      );
    }

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message ?? `Meta API error (HTTP ${response.status})`;
      const errCode: number = data.error?.code ?? 0;
      const guidance = ERROR_GUIDANCE[errCode] ?? "";

      console.error(`[META API ERROR] Code ${errCode}: ${errMsg}`);

      return NextResponse.json(
        { error: guidance ? `${errMsg}\n\n${guidance}` : errMsg },
        { status: response.status }
      );
    }

    const ads = data.data ?? [];
    console.log(`[SCAN] "${query}" in ${country} → ${ads.length} ads found`);

    return NextResponse.json({ ads });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[PROXY ERROR] ${message}`);

    return NextResponse.json(
      { error: `Could not reach Meta API: ${message}. Check your internet connection.` },
      { status: 500 }
    );
  }
}