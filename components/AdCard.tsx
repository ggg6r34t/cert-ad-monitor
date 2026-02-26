"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronUp, ExternalLink, Flag, Search, Link2,
} from "lucide-react";
import type { AnalyzedAd, TriageStatus, Risk, RiskCategory } from "@/types";
import ThreatBadge from "./ThreatBadge";
import TriageSelect from "./TriageSelect";

function formatDate(d?: string | null): string {
  if (!d) return "N/A";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const RISK_COLORS: Record<RiskCategory, string> = {
  impersonation: "bg-purple-50 text-purple-700 border-purple-200",
  typosquat: "bg-red-50 text-red-700 border-red-200",
  scam_signal: "bg-amber-50 text-amber-700 border-amber-200",
  infrastructure: "bg-slate-100 text-slate-600 border-slate-200",
  suspicious: "bg-orange-50 text-orange-700 border-orange-200",
  legitimate: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

function RiskTag({ risk }: { risk: Risk }) {
  const cls = RISK_COLORS[risk.category] ?? RISK_COLORS.suspicious;
  return (
    <span className={`text-xs px-2 py-1 rounded border inline-flex items-center gap-1 ${cls}`}>
      {risk.weight > 0 && <span className="font-bold">+{risk.weight}</span>}
      {risk.weight < 0 && <span className="font-bold text-emerald-600">{risk.weight}</span>}
      {risk.label}
    </span>
  );
}

const BORDER_COLORS: Record<string, string> = {
  critical: "border-l-red-500",
  high: "border-l-orange-500",
  medium: "border-l-amber-400",
  low: "border-l-blue-400",
  info: "border-l-slate-300",
};

interface Props {
  item: AnalyzedAd;
  triage: TriageStatus;
  onTriage: (status: TriageStatus) => void;
  defaultExpanded?: boolean;
}

export default function AdCard({ item, triage, onTriage, defaultExpanded = false }: Props) {
  const [open, setOpen] = useState(defaultExpanded);
  const { ad, analysis } = item;
  const body = ad.ad_creative_bodies?.[0] ?? "";
  const preview = body.length > 140 ? `${body.slice(0, 140)}...` : body;
  const isActive = !ad.ad_delivery_stop_time;
  const borderCls = BORDER_COLORS[analysis.threat] ?? BORDER_COLORS.info;

  return (
    <div className={`bg-white rounded-lg border border-slate-200 border-l-4 shadow-sm ${borderCls}`}>
      {/* Collapsed Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <ThreatBadge level={analysis.threat} />
            <span className="font-semibold text-slate-900 text-sm">{ad.page_name}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" title="Active" />
            )}
            <span className="text-xs text-slate-400">Score: {analysis.score}</span>
          </div>
          <p className="text-sm text-slate-600 leading-snug">
            {preview || "No ad copy available"}
          </p>
          {ad.ad_creative_link_captions?.[0] && (
            <div className="flex items-center gap-1 mt-1.5">
              <Link2 size={11} className="text-slate-400" />
              <span className="text-xs font-mono text-blue-600">
                {ad.ad_creative_link_captions[0]}
              </span>
            </div>
          )}
        </div>
        <div className="ml-3 flex items-center gap-2 shrink-0">
          <TriageSelect value={triage} onChange={onTriage} />
          {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {/* Expanded Detail */}
      {open && (
        <div className="px-4 pb-4 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-sm">
            <div>
              <span className="text-slate-400">Page Name:</span>{" "}
              <span className="text-slate-800 font-medium">{ad.page_name}</span>
            </div>
            <div>
              <span className="text-slate-400">Page ID:</span>{" "}
              <span className="text-slate-700 font-mono text-xs">{ad.page_id}</span>
            </div>
            <div>
              <span className="text-slate-400">First Seen:</span>{" "}
              <span className="text-slate-700">{formatDate(ad.ad_creation_time)}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>{" "}
              {isActive ? (
                <span className="text-emerald-600 font-medium">Active</span>
              ) : (
                <span className="text-slate-500">
                  Inactive since {formatDate(ad.ad_delivery_stop_time)}
                </span>
              )}
            </div>
            {ad.impressions && (
              <div>
                <span className="text-slate-400">Impressions:</span>{" "}
                <span className="text-slate-700">
                  {parseInt(ad.impressions.lower_bound).toLocaleString()}&ndash;
                  {parseInt(ad.impressions.upper_bound).toLocaleString()}
                </span>
              </div>
            )}
            {ad.spend && (
              <div>
                <span className="text-slate-400">Spend:</span>{" "}
                <span className="text-slate-700">
                  {ad.spend.currency ?? "USD"} {ad.spend.lower_bound}&ndash;{ad.spend.upper_bound}
                </span>
              </div>
            )}
            {ad.publisher_platforms && (
              <div className="col-span-2">
                <span className="text-slate-400">Platforms:</span>{" "}
                <span className="text-slate-700">{ad.publisher_platforms.join(", ")}</span>
              </div>
            )}
          </div>

          {/* URLs */}
          {ad.ad_creative_link_captions && ad.ad_creative_link_captions.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Destination URLs
              </div>
              {ad.ad_creative_link_captions.map((u, i) => (
                <div key={i} className="text-sm text-blue-600 font-mono break-all mt-1">{u}</div>
              ))}
            </div>
          )}

          {/* Full body */}
          {body && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Full Ad Copy
              </div>
              <div className="mt-1 p-3 bg-slate-50 rounded-lg text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {body}
              </div>
            </div>
          )}

          {/* Risk factors */}
          {analysis.risks.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Detection Signals ({analysis.risks.length})
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {analysis.risks.map((r, i) => (
                  <RiskTag key={i} risk={r} />
                ))}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2 flex-wrap">
            <a
              href={`https://www.facebook.com/ads/library/?id=${ad.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <ExternalLink size={11} /> View in Ad Library
            </a>
            <a
              href="https://www.facebook.com/help/contact/571927962827151"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Flag size={11} /> Report to Meta
            </a>
            <a
              href={`https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=ALL&q=${encodeURIComponent(ad.page_name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
            >
              <Search size={11} /> All Ads From This Page
            </a>
          </div>
        </div>
      )}
    </div>
  );
}