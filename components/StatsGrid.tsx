"use client";

import { Eye, Activity, XCircle, ShieldAlert, AlertTriangle } from "lucide-react";
import type { ScanStats } from "@/types";

function Stat({
  Icon, label, value, color,
}: {
  Icon: typeof Eye; label: string; value: number; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
      <div className="p-2 rounded-lg bg-slate-50">
        <Icon size={18} className={color} />
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-900">{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}

export default function StatsGrid({ stats }: { stats: ScanStats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      <Stat Icon={Eye} label="Ads Found" value={stats.total} color="text-slate-400" />
      <Stat Icon={Activity} label="Active" value={stats.active} color="text-emerald-600" />
      <Stat Icon={XCircle} label="Critical" value={stats.critical} color="text-red-600" />
      <Stat Icon={ShieldAlert} label="High" value={stats.high} color="text-orange-600" />
      <Stat Icon={AlertTriangle} label="Medium" value={stats.medium} color="text-amber-600" />
    </div>
  );
}