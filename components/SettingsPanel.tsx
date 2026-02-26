"use client";

import { useState } from "react";
import { Settings, ExternalLink } from "lucide-react";

interface Props {
  token: string;
  onTokenChange: (token: string) => void;
  onClose: () => void;
}

export default function SettingsPanel({ token, onTokenChange, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-6 bg-slate-900 rounded-xl border border-slate-700 p-5">
      <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
        <Settings size={18} className="text-slate-400" /> API Configuration
      </h2>

      <label className="block text-sm font-medium text-slate-300 mb-1">
        Meta Ad Library API Token
      </label>
      <div className="flex gap-2">
        <input
          type={visible ? "text" : "password"}
          className="flex-1 px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder="Paste token here"
        />
        <button
          onClick={() => setVisible(!visible)}
          className="px-3 py-2 bg-slate-700 rounded-lg text-sm text-slate-300 hover:bg-slate-600 transition-colors"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        Free token from any confirmed Facebook account. Without it, the tool runs in{" "}
        <strong className="text-slate-400">demo mode</strong>.
      </p>

      <a
        href="https://www.facebook.com/ads/library/api/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 mt-2"
      >
        <ExternalLink size={10} /> Get your free API token from Meta
      </a>

      <div className="mt-4 p-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400">
        <p>
          <strong className="text-slate-300">Setup:</strong> Go to the Meta Ad Library API page.
          Log in with a confirmed Facebook account. Generate a User Access Token. This accesses
          ONLY the public Ad Library — no ad account or client permissions needed.
        </p>
      </div>

      <button
        onClick={onClose}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
}
