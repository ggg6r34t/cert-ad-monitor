"use client";

import { useState } from "react";
import type { Client } from "@/types";

const COUNTRIES = [
  { code: "ALL", name: "All Countries" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
];

interface Props {
  initial?: Client | null;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

export default function ClientForm({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [domains, setDomains] = useState(initial?.domains ?? "");
  const [brandTerms, setBrandTerms] = useState(initial?.brandTerms ?? "");
  const [country, setCountry] = useState(initial?.country ?? "ALL");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      domains: domains.trim(),
      brandTerms: brandTerms.trim(),
      country,
      notes: notes.trim(),
    });
  };

  const inputCls =
    "w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-white";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        {initial ? "Edit Client" : "Add Client to Monitor"}
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Enter brand details to scan for fraudulent ads
      </p>

      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Brand / Company Name *
          </label>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Intesa Sanpaolo"
          />
          <p className="text-xs text-slate-400 mt-1">Used as search term in Meta Ad Library</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Official Domain(s) — comma separated
          </label>
          <input
            className={inputCls}
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="e.g. intesasanpaolo.com, group.intesasanpaolo.com"
          />
          <p className="text-xs text-slate-400 mt-1">Used to detect lookalike / typosquatting domains</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Brand Terms — comma separated
          </label>
          <input
            className={inputCls}
            value={brandTerms}
            onChange={(e) => setBrandTerms(e.target.value)}
            placeholder="e.g. intesa, sanpaolo, ISP banking"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Target Country</label>
          <select
            className={inputCls}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Internal Notes (optional)
          </label>
          <textarea
            className={inputCls}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Previously targeted by phishing in Q3 2024"
          />
        </div>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Save Client
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}