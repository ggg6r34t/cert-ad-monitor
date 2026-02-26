"use client";

import type { ThreatLevel } from "@/types";
import {
  XCircle,
  ShieldAlert,
  AlertTriangle,
  Info,
  Eye,
} from "lucide-react";

const CONFIG: Record<
  ThreatLevel,
  { bg: string; text: string; border: string; label: string; Icon: typeof XCircle }
> = {
  critical: { bg: "bg-red-100", text: "text-red-900", border: "border-red-300", label: "CRITICAL", Icon: XCircle },
  high:     { bg: "bg-orange-100", text: "text-orange-900", border: "border-orange-300", label: "HIGH", Icon: ShieldAlert },
  medium:   { bg: "bg-amber-100", text: "text-amber-900", border: "border-amber-300", label: "MEDIUM", Icon: AlertTriangle },
  low:      { bg: "bg-blue-100", text: "text-blue-900", border: "border-blue-300", label: "LOW", Icon: Info },
  info:     { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", label: "INFO", Icon: Eye },
};

export default function ThreatBadge({ level }: { level: ThreatLevel }) {
  const c = CONFIG[level];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}
    >
      <c.Icon size={11} />
      {c.label}
    </span>
  );
}