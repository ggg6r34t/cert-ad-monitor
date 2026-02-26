"use client";

import type { TriageStatus, TriageOption } from "@/types";

const OPTIONS: TriageOption[] = [
  { value: "new", label: "New", className: "bg-slate-100 text-slate-600" },
  { value: "investigating", label: "Investigating", className: "bg-blue-100 text-blue-700" },
  { value: "confirmed_fraud", label: "Confirmed Fraud", className: "bg-red-100 text-red-700" },
  { value: "reported", label: "Reported to Meta", className: "bg-orange-100 text-orange-700" },
  { value: "false_positive", label: "False Positive", className: "bg-emerald-100 text-emerald-700" },
  { value: "resolved", label: "Resolved", className: "bg-slate-200 text-slate-500" },
];

interface Props {
  value: TriageStatus;
  onChange: (status: TriageStatus) => void;
}

export default function TriageSelect({ value, onChange }: Props) {
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as TriageStatus)}
      className={`text-xs font-semibold rounded px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300 ${current.className}`}
    >
      {OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}