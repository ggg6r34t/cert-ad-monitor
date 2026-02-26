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
  clients,
  activeId,
  results,
  scanning,
  onSelect,
  onAdd,
  onScanAll,
}: Props) {
  const hasClients = clients.length > 0;
  const selectedValue = hasClients && activeId ? activeId : "__none__";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
      <Select
        value={selectedValue}
        onValueChange={(value) => onSelect(value === "__none__" ? null : value)}
        disabled={!hasClients}
      >
        <SelectTrigger className="w-50 border-0 bg-red-600 text-white shadow-lg shadow-red-900/30 hover:bg-red-700 focus-visible:border-red-600 focus-visible:ring-0 disabled:cursor-not-allowed disabled:opacity-60">
          <SelectValue placeholder="Select client" />
        </SelectTrigger>
        <SelectContent>
          {!hasClients && (
            <SelectItem value="__none__">No clients configured</SelectItem>
          )}
          <SelectItem value="__none__" disabled>
            Select client
          </SelectItem>
          {clients.map((c) => {
            const r = results[c.id];
            const active = r?.stats?.active ?? 0;
            return (
              <SelectItem
                key={c.id}
                value={c.id}
                className="hover:bg-slate-500"
              >
                {active > 0 ? `${c.name} (${active} active)` : c.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <button
        onClick={onAdd}
        className="px-3 py-2 rounded-lg text-sm font-medium bg-slate-800 text-slate-400 border border-dashed border-slate-600 hover:border-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
      >
        <Plus size={14} /> Add Client
      </button>

      <button
        onClick={onScanAll}
        disabled={scanning || !hasClients}
        className="ml-auto flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-900/20 transition-colors hover:bg-red-700 disabled:opacity-50"
      >
        {scanning ? (
          <Loader size={14} className="animate-spin" />
        ) : (
          <RefreshCw size={14} />
        )}
        Scan All Clients
      </button>
    </div>
  );
}
