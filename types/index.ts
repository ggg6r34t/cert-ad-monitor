// ── Client Configuration ──

export interface Client {
  id: string;
  name: string;
  domains: string;       // comma-separated official domains
  brandTerms: string;    // comma-separated brand keywords
  country: string;       // ISO country code or "ALL"
  notes: string;
}

// ── Meta Ad Library API response shapes ──

export interface MetaAdImpression {
  lower_bound: string;
  upper_bound: string;
}

export interface MetaAdSpend {
  lower_bound: string;
  upper_bound: string;
  currency?: string;
}

export interface MetaAd {
  id: string;
  page_name: string;
  page_id: string;
  ad_creation_time?: string;
  ad_delivery_start_time?: string;
  ad_delivery_stop_time?: string | null;
  ad_creative_bodies?: string[];
  ad_creative_link_captions?: string[];
  ad_creative_link_titles?: string[];
  ad_creative_link_descriptions?: string[];
  publisher_platforms?: string[];
  impressions?: MetaAdImpression;
  spend?: MetaAdSpend;
}

// ── Analysis Engine ──

export type ThreatLevel = "critical" | "high" | "medium" | "low" | "info";

export type RiskCategory =
  | "impersonation"
  | "typosquat"
  | "scam_signal"
  | "infrastructure"
  | "suspicious"
  | "legitimate";

export interface Risk {
  label: string;
  weight: number;
  category: RiskCategory;
}

export interface AnalysisResult {
  risks: Risk[];
  score: number;
  threat: ThreatLevel;
}

export interface AnalyzedAd {
  ad: MetaAd;
  analysis: AnalysisResult;
}

// ── Scan Results ──

export interface ScanStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  active: number;
  threats: number;    // critical + high
}

export interface ScanResult {
  items: AnalyzedAd[];
  error: string | null;
  isDemo: boolean;
  timestamp: string;
  stats: ScanStats;
}

// ── Triage ──

export type TriageStatus =
  | "new"
  | "investigating"
  | "confirmed_fraud"
  | "reported"
  | "false_positive"
  | "resolved";

export interface TriageOption {
  value: TriageStatus;
  label: string;
  className: string;
}

// ── Alerts ──

export type AlertType = "danger" | "error" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  time: string;
}

// ── API Route ──

export interface AdsApiResponse {
  ads?: MetaAd[];
  error?: string;
}

export interface FetchAdsResult {
  ads: MetaAd[];
  error: string | null;
  isDemo: boolean;
}

// ── Filter ──

export type FilterKey = "all" | "threats" | "medium" | "active";