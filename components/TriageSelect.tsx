"use client";

import type { TriageStatus, TriageOption } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPTIONS: TriageOption[] = [
  { value: "new", label: "New", className: "bg-slate-100 text-slate-600" },
  { value: "investigating", label: "Investigating", className: "bg-blue-100 text-blue-700" },
  { value: "confirmed_fraud", label: "Confirmed Fraud", className: "bg-red-100 text-red-700" },
  { value: "reported", label: "Reported to Meta", className: "bg-orange-100 text-orange-700" },
  { value: "false_positive", label: "False Positive", className: "bg-emerald-100 text-emerald-700" },
  { value: "resolved", label: "Resolved", className: "bg-slate-200 text-slate-500" },
  { value: "suppressed", label: "Suppressed", className: "bg-zinc-200 text-zinc-700" },
];

interface Props {
  value: TriageStatus;
  onChange: (status: TriageStatus) => void;
}

export default function TriageSelect({ value, onChange }: Props) {
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <Select
      value={value}
      onValueChange={(next) => onChange(next as TriageStatus)}
    >
      <SelectTrigger
        className={`h-7 min-w-[128px] border-0 px-2 py-1 text-xs font-semibold ${current.className}`}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
