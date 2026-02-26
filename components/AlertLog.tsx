"use client";

import { Bell, AlertTriangle, Info } from "lucide-react";
import type { Alert } from "@/types";

interface Props {
  alerts: Alert[];
  onClear: () => void;
}

export default function AlertLog({ alerts, onClear }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="mt-8 bg-slate-900 rounded-xl border border-slate-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
          <Bell size={14} /> Alert Log
        </h3>
        <button
          onClick={onClear}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {alerts.map((al) => (
          <div
            key={al.id}
            className={`text-xs px-3 py-2 rounded-lg flex items-center gap-2 ${
              al.type === "danger"
                ? "bg-red-950 text-red-300"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {al.type === "danger" ? <AlertTriangle size={12} /> : <Info size={12} />}
            <span className="flex-1">{al.message}</span>
            <span className="text-slate-600 shrink-0">
              {new Date(al.time).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}