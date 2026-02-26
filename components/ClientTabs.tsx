"use client";

import { Plus, RefreshCw, Loader } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Client, ScanResult } from "@/types";

interface Props {
  clients: Client[];
  activeId: string | null;
  results: Record<string, ScanResult | undefined>;
  scanning: boolean;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onScanAll: () => void;
}

export default function ClientTabs({
  clients, activeId, results, scanning, onSelect, onAdd, onScanAll,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {clients.length > 0 && (
        <Select
          value={activeId ?? "__all__"}
          onValueChange={(value) => onSelect(value === "__all__" ? null : value)}
        >
          <SelectTrigger className="w-[240px] bg-red-600 text-white border-0 shadow-lg shadow-red-900/30 hover:bg-red-700 focus-visible:ring-0 focus-visible:border-red-600">
            <SelectValue placeholder="Select client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Select client</SelectItem>
            {clients.map((c) => {
              const r = results[c.id];
              const threats = r?.stats?.threats ?? 0;
              return (
                <SelectItem key={c.id} value={c.id} className="hover:bg-slate-500">
                  {threats > 0 ? `${c.name} (${threats})` : c.name}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      )}

      <button
        onClick={onAdd}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 border border-dashed border-slate-600 hover:border-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
      >
        <Plus size={14} /> Add Client
      </button>

      {clients.length > 0 && (
        <button
          onClick={onScanAll}
          disabled={scanning}
          className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 transition-colors shadow-lg shadow-red-900/20"
        >
          {scanning ? <Loader size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Scan All Clients
        </button>
      )}
    </div>
  );
}
