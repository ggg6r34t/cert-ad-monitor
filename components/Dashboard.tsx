"use client";

import { useCallback, useEffect, useState } from "react";
import type { Alert, Client, FilterKey } from "@/types";
import { exportScanToCSV } from "@/lib/export-csv";
import { useClientStore } from "@/hooks/useClientStore";
import { useTriageStore } from "@/hooks/useTriageStore";
import { useScanRunner } from "@/hooks/useScanRunner";

import Header from "./Header";
import ClientTabs from "./ClientTabs";
import ClientForm from "./ClientForm";
import EmptyState from "./EmptyState";
import StatsGrid from "./StatsGrid";
import FilterBar from "./FilterBar";
import type { SavedViewKey } from "./FilterBar";
import AdCard from "./AdCard";
import AlertLog from "./AlertLog";

import {
  Search,
  Loader,
  Trash2,
  Clock,
  Info,
  XCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";

function uid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export default function Dashboard() {
  const {
    clients,
    saveClient,
    seedTriageMap,
    health,
    loaded,
    persistState,
  } = useClientStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [filter, setFilter] = useState<FilterKey>("active");
  const [onlyFlagged, setOnlyFlagged] = useState(true);
  const [showSignals, setShowSignals] = useState(false);
  const [hideSuppressed, setHideSuppressed] = useState(true);
  const [savedView, setSavedView] = useState<SavedViewKey>("active_flagged");
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recentCutoffTs] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1000);

  const { triageMap, setTriage } = useTriageStore(seedTriageMap, loaded);

  const addAlert = useCallback((type: Alert["type"], message: string) => {
    setAlerts((prev) =>
      [
        { id: uid(), type, message, time: new Date().toISOString() },
        ...prev,
      ].slice(0, 100),
    );
  }, []);

  const { results, setResults, scanning, runScan, scanAll } = useScanRunner({
    clients,
    tokenConfigured: health?.tokenConfigured,
    onAlert: addAlert,
    onClientScanStart: setActiveId,
  });

  useEffect(() => {
    if (!loaded) return;
    void persistState(clients, triageMap);
  }, [clients, triageMap, loaded, persistState]);

  const activeClient = clients.find((c) => c.id === activeId) ?? null;
  const activeResult = activeId ? (results[activeId] ?? null) : null;

  const onClearClientResults = (id: string) => {
    setResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const filtered =
    activeResult?.items
      ?.filter((x) => {
        if (filter === "all") return true;
        if (filter === "active") return !x.ad.ad_delivery_stop_time;
        if (filter === "inactive") return Boolean(x.ad.ad_delivery_stop_time);
        if (filter === "recent") {
          const start = x.ad.ad_delivery_start_time;
          if (!start) return false;
          return new Date(start).getTime() >= recentCutoffTs;
        }
        return true;
      })
      .filter((x) => (onlyFlagged ? x.analysis.score > 0 : true))
      .filter((x) => {
        if (!activeId) return true;
        const triageKey = `${activeId}:${x.ad.id}`;
        const triage = triageMap[triageKey] ?? "new";
        if (savedView === "all_active") {
          return !x.ad.ad_delivery_stop_time;
        }
        if (savedView === "investigating_queue") {
          return triage === "investigating";
        }
        return !x.ad.ad_delivery_stop_time && x.analysis.score > 0;
      })
      .filter((x) => {
        if (!hideSuppressed || !activeId) return true;
        const triageKey = `${activeId}:${x.ad.id}`;
        return triageMap[triageKey] !== "suppressed";
      }) ?? [];

  const dangerCount = alerts.filter((a) => a.type === "danger").length;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        dangerCount={dangerCount}
      />

      <div className="mx-auto max-w-7xl px-4 py-16">
        <ClientTabs
          clients={clients}
          activeId={activeId}
          results={results}
          scanning={scanning}
          onSelect={setActiveId}
          onAdd={() => {
            setShowForm(true);
            setEditClient(null);
          }}
          onScanAll={scanAll}
        />

        {showForm && (
          <div className="mb-5">
            <ClientForm
              initial={editClient}
              onSave={(client) => {
                saveClient(client);
                setShowForm(false);
                setEditClient(null);
              }}
              onCancel={() => {
                setShowForm(false);
                setEditClient(null);
              }}
            />
          </div>
        )}

        {clients.length === 0 && !showForm && (
          <EmptyState onAddClient={() => setShowForm(true)} />
        )}

        {activeClient && (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {activeClient.name}
                </h2>
                <p className="text-sm text-slate-400">
                  {activeClient.domains || "No domains configured"} |{" "}
                  {activeClient.country === "ALL"
                    ? "Global"
                    : activeClient.country}
                  {activeClient.notes ? ` | ${activeClient.notes}` : ""}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditClient(activeClient);
                    setShowForm(true);
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => runScan(activeClient)}
                  disabled={scanning}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {scanning ? (
                    <Loader size={13} className="animate-spin" />
                  ) : (
                    <Search size={13} />
                  )}{" "}
                  Scan Now
                </button>
                <button
                  onClick={() => onClearClientResults(activeClient.id)}
                  title="Clear current scan results"
                  aria-label="Clear current scan results"
                  className="rounded-lg border border-red-800 bg-slate-800 px-3 py-1.5 text-sm text-red-400 transition-colors hover:bg-red-900/30"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>

            {activeResult?.isDemo && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-indigo-800 bg-indigo-950 p-3 text-sm text-indigo-300">
                <Info size={16} className="mt-0.5 shrink-0" />
                <span>
                  <strong>Demo Mode:</strong> server token is not configured.
                  Set `META_AD_LIBRARY_TOKEN` to scan real ads.
                </span>
              </div>
            )}

            {activeResult?.error && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-800 bg-red-950 p-3 text-sm text-red-300">
                <XCircle size={16} className="mt-0.5 shrink-0" />
                <div>
                  <strong>Scan Error</strong>
                  <div className="mt-1.5 whitespace-pre-wrap leading-relaxed">
                    {activeResult.error}
                  </div>
                  <a
                    href="https://www.facebook.com/ads/library/api/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
                  >
                    <ExternalLink size={10} /> Go to Meta Ad Library API page
                  </a>
                </div>
              </div>
            )}

            {activeResult?.stats && <StatsGrid stats={activeResult.stats} />}

            {activeResult && activeResult.items.length > 0 && (
              <FilterBar
                filter={filter}
                onFilter={setFilter}
                stats={activeResult.stats}
                total={activeResult.items.length}
                onExport={() =>
                  exportScanToCSV(activeResult, activeClient.name)
                }
                onlyFlagged={onlyFlagged}
                onToggleOnlyFlagged={() => setOnlyFlagged((v) => !v)}
                showSignals={showSignals}
                onToggleShowSignals={() => setShowSignals((v) => !v)}
                hideSuppressed={hideSuppressed}
                onToggleHideSuppressed={() => setHideSuppressed((v) => !v)}
                onBulkSuppressVisible={() => {
                  if (!activeId) return;
                  for (const item of filtered) {
                    setTriage(`${activeId}:${item.ad.id}`, "suppressed");
                  }
                }}
                onBulkMarkInvestigatingVisible={() => {
                  if (!activeId) return;
                  for (const item of filtered) {
                    setTriage(`${activeId}:${item.ad.id}`, "investigating");
                  }
                }}
                view={savedView}
                onViewChange={setSavedView}
              />
            )}

            {activeResult?.changeSummary && (
              <div className="mb-4 rounded-lg border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-200">Since last scan</div>
                <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded bg-slate-800 px-2 py-1">
                    New active: <span className="font-semibold text-emerald-300">+{activeResult.changeSummary.newActive}</span>
                  </div>
                  <div className="rounded bg-slate-800 px-2 py-1">
                    Resolved active: <span className="font-semibold text-blue-300">-{activeResult.changeSummary.resolvedActive}</span>
                  </div>
                  <div className="rounded bg-slate-800 px-2 py-1">
                    New flagged: <span className="font-semibold text-amber-300">+{activeResult.changeSummary.newFlagged}</span>
                  </div>
                </div>
                {activeResult.changeSummary.previousScanAt && (
                  <p className="mt-2 text-xs text-slate-500">
                    Previous scan: {new Date(activeResult.changeSummary.previousScanAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => {
                  const triageKey = `${activeId}:${item.ad.id}`;
                  return (
                    <AdCard
                      key={item.ad.id}
                      item={item}
                      triage={triageMap[triageKey] ?? "new"}
                      onTriage={(status) => setTriage(triageKey, status)}
                      defaultExpanded={!item.ad.ad_delivery_stop_time}
                      showSignals={showSignals}
                    />
                  );
                })}
              </div>
              {activeResult && filtered.length === 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 py-10 text-center">
                  <CheckCircle
                    size={32}
                    className="mx-auto mb-2 text-emerald-500"
                  />
                  <p className="font-medium text-slate-300">
                    No ads match this filter
                  </p>
                </div>
              )}
            </>

            {activeResult?.timestamp && (
              <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
                <Clock size={12} /> Scanned:{" "}
                {new Date(activeResult.timestamp).toLocaleString()}
              </p>
            )}
          </div>
        )}

        <AlertLog alerts={alerts} onClear={() => setAlerts([])} />

        <div className="mt-8 pb-6 text-center text-xs text-slate-600">
          <p>
            Uses the public Meta Ad Library API only. No client account access
            required.
          </p>
          <p className="mt-1">
            Client and triage data are persisted server-side for internal team
            use.
          </p>
        </div>
      </div>
    </div>
  );
}
