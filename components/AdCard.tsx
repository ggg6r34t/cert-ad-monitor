"use client";

import { ExternalLink, Flag, Link2 } from "lucide-react";
import type { AnalyzedAd, TriageStatus } from "@/types";
import { extractDomain } from "@/lib/analysis";
import TriageSelect from "./TriageSelect";

interface Props {
  item: AnalyzedAd;
  triage: TriageStatus;
  onTriage: (status: TriageStatus) => void;
  defaultExpanded?: boolean;
  showSignals?: boolean;
}

function formatDate(value?: string | null): string {
  if (!value) return "N/A";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function runningDays(start?: string | null, stop?: string | null): string {
  if (!start) return "Unknown runtime";
  const startTs = new Date(start).getTime();
  const endTs = stop ? new Date(stop).getTime() : Date.now();
  const days = Math.max(1, Math.ceil((endTs - startTs) / (1000 * 60 * 60 * 24)));
  return `${days} day${days === 1 ? "" : "s"}`;
}

export default function AdCard({ item, triage, onTriage, showSignals = false }: Props) {
  const { ad, analysis } = item;
  const isActive = !ad.ad_delivery_stop_time;
  const body = ad.ad_creative_bodies?.[0] ?? "No ad copy available";
  const destination = ad.ad_creative_link_captions?.[0] ?? "No destination URL";
  const destinationHost = ad.ad_creative_link_captions?.[0]
    ? extractDomain(ad.ad_creative_link_captions[0])
    : "unknown";

  return (
    <article
      className={`rounded-xl border shadow-sm bg-white p-4 space-y-3 ${
        isActive ? "border-emerald-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}
            >
              {isActive ? "ACTIVE" : "INACTIVE"}
            </span>
            <h3 className="text-sm font-semibold text-slate-900 truncate">{ad.page_name}</h3>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Started {formatDate(ad.ad_delivery_start_time ?? ad.ad_creation_time)}
            {" | "}
            Running {runningDays(ad.ad_delivery_start_time ?? ad.ad_creation_time, ad.ad_delivery_stop_time)}
          </p>
        </div>
        <TriageSelect value={triage} onChange={onTriage} />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Link2 size={12} /> Destination
        </div>
        <div className="text-sm font-mono text-blue-700 break-all">{destinationHost}</div>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed line-clamp-3">{body}</p>

      {showSignals && analysis.risks.length > 0 && (
        <details className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">
            Detection details ({analysis.risks.length})
          </summary>
          <ul className="mt-2 text-xs text-slate-600 space-y-1 list-disc pl-4">
            {analysis.risks.map((risk, idx) => (
              <li key={`${risk.label}-${idx}`}>{risk.label}</li>
            ))}
          </ul>
        </details>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={`https://www.facebook.com/ads/library/?id=${ad.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-200 transition-colors"
        >
          <ExternalLink size={11} /> Open Ad
        </a>
        <a
          href="https://www.facebook.com/help/contact/571927962827151"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 text-xs text-red-700 hover:bg-red-100 transition-colors"
        >
          <Flag size={11} /> Report
        </a>
        <span className="text-[11px] text-slate-500 ml-auto">{destination}</span>
      </div>
    </article>
  );
}
