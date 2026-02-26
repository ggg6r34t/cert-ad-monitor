import type { MetaAd, Client, AnalysisResult, Risk, ThreatLevel, RiskCategory } from "@/types";

// ── String Distance ──

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
      );
  return d[m][n];
}

function domainSimilarity(d1: string, d2: string): number {
  const a = d1.replace(/^www\./, "").toLowerCase();
  const b = d2.replace(/^www\./, "").toLowerCase();
  if (a === b) return 1;
  return Math.max(0, 1 - levenshtein(a, b) / Math.max(a.length, b.length));
}

export function extractDomain(url: string): string {
  try {
    const full = url.startsWith("http") ? url : `https://${url}`;
    return new URL(full).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ── Scam Signal Definitions ──

interface ScamSignal {
  pattern: RegExp;
  weight: number;
  label: string;
}

const SCAM_SIGNALS: ScamSignal[] = [
  { pattern: /free\s*(gift|money|iphone|crypto|bitcoin|token|nft)/i, weight: 4, label: "Free gift / crypto lure" },
  { pattern: /(limited\s*time|act\s*now|hurry|don'?t\s*miss|last\s*chance|ending\s*soon)/i, weight: 2, label: "Urgency / pressure tactics" },
  { pattern: /(verify|confirm|validate)\s*(your|account|identity|email)/i, weight: 5, label: "Phishing — credential harvesting" },
  { pattern: /(earn|make|get)\s*\$?\d+.*?(day|hour|week|month)/i, weight: 3, label: "Get-rich-quick scheme" },
  { pattern: /bit\.ly|tinyurl|t\.co|shorturl|is\.gd|rb\.gy/i, weight: 3, label: "URL shortener hiding destination" },
  { pattern: /(login|log\s*in|signin|sign\s*in|password|credential)/i, weight: 4, label: "Login / credential language" },
  { pattern: /(whatsapp|telegram|signal).*?(group|join|click|message)/i, weight: 3, label: "Redirecting to messaging platform" },
  { pattern: /(giveaway|winner|selected|congratul|you\s*(won|have\s*been))/i, weight: 4, label: "Fake giveaway / prize scam" },
  { pattern: /(investment|invest\s*now|guaranteed\s*return|roi|trading\s*bot)/i, weight: 4, label: "Investment / financial scam" },
  { pattern: /(customer\s*service|support\s*team|help\s*desk|call\s*now.*?\d)/i, weight: 3, label: "Fake customer support" },
  { pattern: /(account\s*(suspend|block|locked|disabled|restrict))/i, weight: 4, label: "Account scare tactic" },
  { pattern: /(claim|redeem|activate)\s*(your|now|here|bonus|reward)/i, weight: 3, label: "Fake reward / claim" },
  { pattern: /(wire\s*transfer|western\s*union|moneygram|gift\s*card\s*pay)/i, weight: 5, label: "Suspicious payment method" },
  { pattern: /(too\s*good|unbelievable|shocking|secret\s*(method|trick))/i, weight: 2, label: "Clickbait / too-good-to-be-true" },
];

const SUSPICIOUS_TLDS = [
  ".xyz", ".top", ".buzz", ".click", ".link", ".club", ".online", ".site",
  ".store", ".icu", ".tk", ".ml", ".ga", ".cf", ".pw", ".cc", ".ws",
  ".vip", ".bid", ".win", ".party", ".stream", ".download", ".racing",
  ".date", ".review", ".trade",
];

// ── Main Analysis Function ──

export function analyzeAd(ad: MetaAd, client: Client): AnalysisResult {
  const risks: Risk[] = [];
  let score = 0;

  const text = [
    ...(ad.ad_creative_bodies ?? []),
    ...(ad.ad_creative_link_titles ?? []),
    ...(ad.ad_creative_link_descriptions ?? []),
  ].join(" ").toLowerCase();

  const urls = ad.ad_creative_link_captions ?? [];
  const adPage = (ad.page_name ?? "").toLowerCase();
  const clientName = client.name.toLowerCase();

  const officialDomains = client.domains
    .split(",").map((d) => d.trim().toLowerCase()).filter(Boolean);

  const brandTerms = client.brandTerms
    .split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
  brandTerms.push(clientName);

  // ── 1. Page Name Impersonation ──

  if (adPage && clientName) {
    if (adPage === clientName) {
      score += 2;
      risks.push({ label: "Page name exactly matches brand", weight: 2, category: "impersonation" });
    } else if (adPage.includes(clientName) || clientName.includes(adPage)) {
      score += 3;
      risks.push({
        label: `Page name contains brand: "${ad.page_name}"`,
        weight: 3,
        category: "impersonation",
      });
    } else {
      const sim = domainSimilarity(
        adPage.replace(/\s/g, ""),
        clientName.replace(/\s/g, "")
      );
      if (sim > 0.75) {
        score += 3;
        risks.push({
          label: `Page name ${(sim * 100).toFixed(0)}% similar to brand`,
          weight: 3,
          category: "impersonation",
        });
      }
    }
  }

  // ── 2. Brand Terms in Ad Copy ──

  const hits = brandTerms.filter((bt) => bt.length >= 3 && text.includes(bt));
  if (hits.length > 0) {
    const w = Math.min(hits.length, 2);
    score += w;
    risks.push({
      label: `Ad references brand terms: ${hits.join(", ")}`,
      weight: w,
      category: "impersonation",
    });
  }

  // ── 3. Domain Analysis ──

  for (const url of urls) {
    const dom = extractDomain(url);
    const isOfficial = officialDomains.some(
      (od) => dom === od || dom.endsWith(`.${od}`)
    );

    if (isOfficial) {
      score -= 2;
      risks.push({ label: `Links to official domain: ${dom}`, weight: -2, category: "legitimate" });
      continue;
    }

    // Typosquatting check
    for (const od of officialDomains) {
      const sim = domainSimilarity(dom, od);
      if (sim > 0.55 && sim < 1) {
        score += 4;
        risks.push({
          label: `"${dom}" looks like "${od}" (${(sim * 100).toFixed(0)}% similar)`,
          weight: 4,
          category: "typosquat",
        });
      }
      const baseName = od.split(".")[0];
      if (baseName.length >= 3 && dom !== od && dom.includes(baseName)) {
        score += 3;
        risks.push({
          label: `"${dom}" contains brand name but isn't official`,
          weight: 3,
          category: "typosquat",
        });
      }
    }

    // Suspicious TLD
    if (SUSPICIOUS_TLDS.some((tld) => dom.endsWith(tld))) {
      score += 2;
      risks.push({ label: `Suspicious TLD: ${dom}`, weight: 2, category: "infrastructure" });
    }
  }

  // ── 4. Scam Signal Matching ──

  const fullText = `${text} ${urls.join(" ")}`;
  for (const sig of SCAM_SIGNALS) {
    if (sig.pattern.test(fullText)) {
      score += sig.weight;
      risks.push({ label: sig.label, weight: sig.weight, category: "scam_signal" });
    }
  }

  // ── 5. Missing URL ──

  if (urls.length === 0 && text.length > 20) {
    score += 1;
    risks.push({ label: "No visible destination URL", weight: 1, category: "suspicious" });
  }

  score = Math.max(0, score);

  const threat: ThreatLevel =
    score >= 8 ? "critical" :
    score >= 5 ? "high" :
    score >= 3 ? "medium" :
    score >= 1 ? "low" : "info";

  return { risks, score, threat };
}