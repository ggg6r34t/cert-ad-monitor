"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  Client, ScanResult, Alert, TriageStatus, FilterKey, FetchAdsResult,
} from "@/types";
import { analyzeAd } from "@/lib/analysis";
import { generateDemoData } from "@/lib/demo-data";
import { exportScanToCSV } from "@/lib/export-csv";

import Header from "./Header";
import SettingsPanel from "./SettingsPanel";
import ClientTabs from "./ClientTabs";
import ClientForm from "./ClientForm";
import EmptyState from "./EmptyState";
import StatsGrid from "./StatsGrid";
import FilterBar from "./FilterBar";
import AdCard from "./AdCard";
import AlertLog from "./AlertLog";

import {
  Search, Loader, Trash2, Clock, Info, XCircle, CheckCircle, ExternalLink,
} from "lucide-react";

// ── Persistence helpers ──

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded — degrade gracefully */ }
}

function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// ── Fetch ads through the API route ──

async function fetchAds(
  query: string, token: string, country: string
): Promise<FetchAdsResult> {
  if (!token) return generateDemoData(query);

  const params = new URLSearchParams({ q: query, token, country });

  try {
    const res = await fetch(`/api/ads?${params.toString()}`);
    const contentType = res.headers.get("content-type") ?? "";

    if (!contentType.includes("json")) {
      const text = await res.text();
      if (text.includes("<!DOCTYPE") || text.includes("<html")) {
        return {
          ads: [],
          isDemo: false,
          error:
            "Meta returned an HTML page instead of data. Your API token is likely expired or invalid.\n\n" +
            "Steps to fix:\n" +
            "1. Go to facebook.com/ads/library/api\n" +
            "2. Log in with a confirmed Facebook account\n" +
            "3. Generate a new User Access Token\n" +
            "4. Paste it in Settings",
        };
      }
      return { ads: [], error: `Unexpected response (status ${res.status})`, isDemo: false };
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    return { ads: data.ads ?? [], error: null, isDemo: false };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.includes("JSON") || msg.includes("Unexpected token")) {
      return {
        ads: [],
        isDemo: false,
        error: "Server returned invalid data. Token may be expired — generate a new one at facebook.com/ads/library/api.",
      };
    }
    return { ads: [], error: msg, isDemo: false };
  }
}

// ── Dashboard Component ──

export default function Dashboard() {
  // State
  const [clients, setClients] = useState<Client[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, ScanResult>>({});
  const [scanning, setScanning] = useState(false);
  const [apiToken, setApiToken] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [triageMap, setTriageMap] = useState<Record<string, TriageStatus>>({});
  const [loaded, setLoaded] = useState(false);

  const scanLock = useRef(false);

  // Load persisted data on mount
  useEffect(() => {
    setClients(loadFromStorage<Client[]>("cert_clients", []));
    setApiToken(loadFromStorage<string>("cert_token", ""));
    setTriageMap(loadFromStorage<Record<string, TriageStatus>>("cert_triage", {}));
    setLoaded(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (loaded) saveToStorage("cert_clients", clients);
  }, [clients, loaded]);

  useEffect(() => {
    if (loaded) saveToStorage("cert_token", apiToken);
  }, [apiToken, loaded]);

  useEffect(() => {
    if (loaded) saveToStorage("cert_triage", triageMap);
  }, [triageMap, loaded]);

  // Derived
  const activeClient = clients.find((c) => c.id === activeId) ?? null;
  const activeResult = activeId ? results[activeId] ?? null : null;

  const addAlert = useCallback((type: Alert["type"], message: string) => {
    setAlerts((prev) => [
      { id: uid(), type, message, time: new Date().toISOString() },
      ...prev,
    ].slice(0, 100));
  }, []);

  // ── Scan logic ──

  const runScan = useCallback(async (client: Client) => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanning(true);
    setActiveId(client.id);

    const data = await fetchAds(client.name, apiToken, client.country);

    if (data.error) {
      const failResult: ScanResult = {
        items: [],
        error: data.error,
        isDemo: false,
        timestamp: new Date().toISOString(),
        stats: { total: 0, critical: 0, high: 0, medium: 0, active: 0, threats: 0 },
      };
      setResults((prev) => ({ ...prev, [client.id]: failResult }));
      addAlert("error", `Scan failed for ${client.name}: ${data.error}`);
    } else {
      const items = data.ads
        .map((ad) => ({ ad, analysis: analyzeAd(ad, client) }))
        .sort((a, b) => b.analysis.score - a.analysis.score);

      const critical = items.filter((x) => x.analysis.threat === "critical").length;
      const high = items.filter((x) => x.analysis.threat === "high").length;
      const medium = items.filter((x) => x.analysis.threat === "medium").length;
      const active = items.filter((x) => !x.ad.ad_delivery_stop_time).length;

      const scanResult: ScanResult = {
        items,
        error: null,
        isDemo: data.isDemo,
        timestamp: new Date().toISOString(),
        stats: { total: items.length, critical, high, medium, active, threats: critical + high },
      };
      setResults((prev) => ({ ...prev, [client.id]: scanResult }));

      if (critical + high > 0) {
        addAlert("danger", `${critical + high} critical/high threat(s) detected targeting ${client.name}!`);
      }
    }

    setScanning(false);
    scanLock.current = false;
  }, [apiToken, addAlert]);

  const scanAll = useCallback(async () => {
    for (const client of clients) {
      await runScan(client);
      await new Promise((r) => setTimeout(r, 600));
    }
  }, [clients, runScan]);

  // ── Client CRUD ──

  const saveClient = (client: Client) => {
    setClients((prev) => {
      const exists = prev.find((c) => c.id === client.id);
      return exists ? prev.map((c) => (c.id === client.id ? client : c)) : [...prev, client];
    });
    setShowForm(false);
    setEditClient(null);
  };

  const deleteClient = (id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
    setResults((prev) => { const next = { ...prev }; delete next[id]; return next; });
    if (activeId === id) setActiveId(null);
  };

  // ── Filtering ──

  const filtered = activeResult?.items?.filter((x) => {
    if (filter === "all") return true;
    if (filter === "threats") return x.analysis.threat === "critical" || x.analysis.threat === "high";
    if (filter === "medium") return x.analysis.threat === "medium";
    if (filter === "active") return !x.ad.ad_delivery_stop_time;
    return true;
  }) ?? [];

  const dangerCount = alerts.filter((a) => a.type === "danger").length;

  // ── Render ──

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        dangerCount={dangerCount}
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings((p) => !p)}
      />

      <div className="max-w-7xl mx-auto px-4 py-16">
        {/* Settings */}
        {showSettings && (
          <SettingsPanel
            token={apiToken}
            onTokenChange={setApiToken}
            onClose={() => setShowSettings(false)}
          />
        )}

        {/* Client tabs */}
        <ClientTabs
          clients={clients}
          activeId={activeId}
          results={results}
          scanning={scanning}
          onSelect={setActiveId}
          onAdd={() => { setShowForm(true); setEditClient(null); }}
          onScanAll={scanAll}
        />

        {/* Client form */}
        {showForm && (
          <div className="mb-5">
            <ClientForm
              initial={editClient}
              onSave={saveClient}
              onCancel={() => { setShowForm(false); setEditClient(null); }}
            />
          </div>
        )}

        {/* Empty state */}
        {clients.length === 0 && !showForm && (
          <EmptyState onAddClient={() => setShowForm(true)} />
        )}

        {/* Active client view */}
        {activeClient && (
          <div>
            {/* Client header */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">{activeClient.name}</h2>
                <p className="text-sm text-slate-400">
                  {activeClient.domains || "No domains configured"} |{" "}
                  {activeClient.country === "ALL" ? "Global" : activeClient.country}
                  {activeClient.notes ? ` | ${activeClient.notes}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setEditClient(activeClient); setShowForm(true); }}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => runScan(activeClient)}
                  disabled={scanning}
                  className="px-4 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-1.5 disabled:opacity-50 font-semibold transition-colors"
                >
                  {scanning ? (
                    <Loader size={13} className="animate-spin" />
                  ) : (
                    <Search size={13} />
                  )}{" "}
                  Scan Now
                </button>
                <button
                  onClick={() => deleteClient(activeClient.id)}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-800 border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {/* Demo mode banner */}
            {activeResult?.isDemo && (
              <div className="mb-4 p-3 bg-indigo-950 border border-indigo-800 rounded-lg text-sm text-indigo-300 flex items-start gap-2">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Demo Mode:</strong> Showing sample data to demonstrate detection
                  capabilities. Add a Meta Ad Library API token in Settings to scan real ads.
                </span>
              </div>
            )}

            {/* Error banner */}
            {activeResult?.error && (
              <div className="mb-4 p-3 bg-red-950 border border-red-800 rounded-lg text-sm text-red-300 flex items-start gap-2">
                <XCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <strong>Scan Error</strong>
                  <div className="whitespace-pre-wrap mt-1.5 leading-relaxed">
                    {activeResult.error}
                  </div>
                  <a
                    href="https://www.facebook.com/ads/library/api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-amber-400 text-xs hover:text-amber-300"
                  >
                    <ExternalLink size={10} /> Go to Meta Ad Library API page
                  </a>
                </div>
              </div>
            )}

            {/* Stats */}
            {activeResult?.stats && <StatsGrid stats={activeResult.stats} />}

            {/* Filter + export */}
            {activeResult && activeResult.items.length > 0 && (
              <FilterBar
                filter={filter}
                onFilter={setFilter}
                stats={activeResult.stats}
                total={activeResult.items.length}
                onExport={() => exportScanToCSV(activeResult, activeClient.name)}
              />
            )}

            {/* Ad cards */}
            <div className="space-y-2">
              {filtered.map((item) => {
                const triageKey = `${activeId}:${item.ad.id}`;
                return (
                  <AdCard
                    key={item.ad.id}
                    item={item}
                    triage={triageMap[triageKey] ?? "new"}
                    onTriage={(status) =>
                      setTriageMap((prev) => ({ ...prev, [triageKey]: status }))
                    }
                    defaultExpanded={item.analysis.threat === "critical"}
                  />
                );
              })}
              {activeResult && filtered.length === 0 && (
                <div className="text-center py-10 bg-slate-900 rounded-xl border border-slate-800">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-500" />
                  <p className="font-medium text-slate-300">No ads match this filter</p>
                </div>
              )}
            </div>

            {/* Timestamp */}
            {activeResult?.timestamp && (
              <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
                <Clock size={12} /> Scanned:{" "}
                {new Date(activeResult.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Alerts */}
        <AlertLog alerts={alerts} onClear={() => setAlerts([])} />

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-slate-600 pb-6">
          <p>Uses the public Meta Ad Library API only. No client account access required.</p>
          <p className="mt-1">All analysis runs locally. Client config saved in browser.</p>
        </div>
      </div>
    </div>
  );
}