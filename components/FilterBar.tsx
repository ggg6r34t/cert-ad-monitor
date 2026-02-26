"use client";

import { Download } from "lucide-react";
import type { FilterKey, ScanStats } from "@/types";

interface Props {
  filter: FilterKey;
  onFilter: (key: FilterKey) => void;
  stats: ScanStats;
  total: number;
  onExport: () => void;
}

export default function FilterBar({ filter, onFilter, stats, total, onExport }: Props) {
  const tabs: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: total },
    { key: "threats", label: "Critical + High", count: stats.threats },
    { key: "medium", label: "Medium", count: stats.medium },
    { key: "active", label: "Active Only", count: stats.active },
  ];

  return (
    <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
      <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-700 p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onFilter(t.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === t.key
                ? "bg-red-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            {t.label} ({t.count})
          </button>
        ))}
      </div>
      <button
        onClick={onExport}
        className="px-3 py-1.5 rounded-lg text-sm text-slate-400 bg-slate-800 border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 transition-colors"
      >
        <Download size={13} /> Export CSV
      </button>
    </div>
  );
}