// Client configuration

export interface Client {
  id: string;
  name: string;
  domains: string; // comma-separated official domains
  brandTerms: string; // comma-separated brand keywords
  country: string; // ISO country code or "ALL"
  notes: string;
}

// Meta Ad Library API response shapes

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

// Analysis engine

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

// Scan results

export interface ScanStats {
  total: number;
  active: number;
  inactive: number;
  startedLast7d: number;
}

export interface ScanResult {
  items: AnalyzedAd[];
  error: string | null;
  isDemo: boolean;
  timestamp: string;
  stats: ScanStats;
  changeSummary?: {
    previousScanAt?: string;
    newActive: number;
    resolvedActive: number;
    newFlagged: number;
  };
}

// Triage

export type TriageStatus =
  | "new"
  | "investigating"
  | "confirmed_fraud"
  | "reported"
  | "false_positive"
  | "resolved"
  | "suppressed";

export interface TriageOption {
  value: TriageStatus;
  label: string;
  className: string;
}

// Alerts

export type AlertType = "danger" | "error" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  time: string;
}

// API route

export interface AdsApiResponse {
  ads?: MetaAd[];
  error?: string;
}

export interface FetchAdsResult {
  ads: MetaAd[];
  error: string | null;
  isDemo: boolean;
}

// Filter

export type FilterKey = "all" | "active" | "inactive" | "recent";
