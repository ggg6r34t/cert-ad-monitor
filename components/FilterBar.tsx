"use client";

import { Download } from "lucide-react";
import type { FilterKey, ScanStats } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type SavedViewKey =
  | "active_flagged"
  | "all_active"
  | "investigating_queue";

interface Props {
  filter: FilterKey;
  onFilter: (key: FilterKey) => void;
  stats: ScanStats;
  total: number;
  onExport: () => void;
  onlyFlagged: boolean;
  onToggleOnlyFlagged: () => void;
  showSignals: boolean;
  onToggleShowSignals: () => void;
  hideSuppressed: boolean;
  onToggleHideSuppressed: () => void;
  onBulkSuppressVisible: () => void;
  onBulkMarkInvestigatingVisible: () => void;
  view: SavedViewKey;
  onViewChange: (view: SavedViewKey) => void;
}

export default function FilterBar({
  filter,
  onFilter,
  stats,
  total,
  onExport,
  onlyFlagged,
  onToggleOnlyFlagged,
  showSignals,
  onToggleShowSignals,
  hideSuppressed,
  onToggleHideSuppressed,
  onBulkSuppressVisible,
  onBulkMarkInvestigatingVisible,
  view,
  onViewChange,
}: Props) {
  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: total },
    { key: "active", label: "Active", count: stats.active },
    { key: "inactive", label: "Inactive", count: stats.inactive },
    { key: "recent", label: "Started 7d", count: stats.startedLast7d },
  ];

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-700 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onFilter(t.key)}
            className={`px-2.5 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-red-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={view}
          onValueChange={(value) => onViewChange(value as SavedViewKey)}
        >
          <SelectTrigger className="h-8.5! rounded-lg border-slate-700 bg-slate-800 px-2.5 py-1.5 text-sm text-slate-300">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active_flagged">View: Active Flagged</SelectItem>
            <SelectItem value="all_active">View: All Active</SelectItem>
            <SelectItem value="investigating_queue">
              View: Investigating Queue
            </SelectItem>
          </SelectContent>
        </Select>
        <button
          onClick={onToggleOnlyFlagged}
          className={`px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
            onlyFlagged
              ? "bg-emerald-900/40 text-emerald-300 border-emerald-700"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
          }`}
        >
          Only Flagged: {onlyFlagged ? "On" : "Off"}
        </button>
        <button
          onClick={onToggleShowSignals}
          className={`px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
            showSignals
              ? "bg-blue-900/40 text-blue-300 border-blue-700"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
          }`}
        >
          Detection Details: {showSignals ? "On" : "Off"}
        </button>
        <button
          onClick={onToggleHideSuppressed}
          className={`px-2.5 py-1.5 rounded-lg text-sm border transition-colors ${
            hideSuppressed
              ? "bg-zinc-900/40 text-zinc-300 border-zinc-700"
              : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700"
          }`}
        >
          Hide Suppressed: {hideSuppressed ? "On" : "Off"}
        </button>
        <button
          onClick={onBulkMarkInvestigatingVisible}
          className="px-2.5 py-1.5 rounded-lg text-sm text-blue-300 bg-blue-950/30 border border-blue-800 hover:bg-blue-900/40 transition-colors"
        >
          Bulk Investigating
        </button>
        <button
          onClick={onBulkSuppressVisible}
          className="px-2.5 py-1.5 rounded-lg text-sm text-zinc-300 bg-zinc-900/40 border border-zinc-700 hover:bg-zinc-800/50 transition-colors"
        >
          Bulk Suppress
        </button>
        <button
          onClick={onExport}
          className="px-2.5 py-1.5 rounded-lg text-sm text-slate-400 bg-slate-800 border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>
    </div>
  );
}
