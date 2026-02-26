"use client";

import { ShieldAlert, Plus } from "lucide-react";

interface Props {
  onAddClient: () => void;
}

export default function EmptyState({ onAddClient }: Props) {
  return (
    <div className="text-center py-16 bg-slate-900 rounded-xl border border-slate-800">
      <ShieldAlert size={48} className="mx-auto text-slate-600 mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">CERT Ad Fraud Monitor</h2>
      <p className="text-slate-400 mb-2 max-w-lg mx-auto">
        Scan the Meta Ad Library for fraudulent, impersonation, and scam ads targeting your clients.
      </p>
      <p className="text-slate-500 mb-6 text-sm">
        No access to client Facebook or Meta Ads accounts required.
      </p>
      <button
        onClick={onAddClient}
        className="px-5 py-2.5 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors inline-flex items-center gap-2 shadow-lg shadow-red-900/30"
      >
        <Plus size={16} /> Add First Client to Monitor
      </button>
    </div>
  );
}