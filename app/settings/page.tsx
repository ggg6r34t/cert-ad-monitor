"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, Trash2 } from "lucide-react";
import Header from "@/components/Header";
import SettingsPanel from "@/components/SettingsPanel";
import { useClientStore } from "@/hooks/useClientStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const PAGE_SIZE = 5;
  const router = useRouter();
  const { clients, setClients, seedTriageMap, health, refreshHealth, loaded, persistState } = useClientStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("ALL_COUNTRIES");
  const [page, setPage] = useState(1);

  useEffect(() => {
    void refreshHealth();
  }, [refreshHealth]);

  const deleteClientFromSettings = async (clientId: string) => {
    if (!loaded) return;
    setDeletingId(clientId);
    const nextClients = clients.filter((client) => client.id !== clientId);
    const nextTriageMap = Object.fromEntries(
      Object.entries(seedTriageMap).filter(([key]) => !key.startsWith(`${clientId}:`))
    );
    setClients(nextClients);
    try {
      await persistState(nextClients, nextTriageMap);
    } finally {
      setDeletingId(null);
    }
  };

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const client of clients) set.add(client.country || "ALL");
    return ["ALL_COUNTRIES", ...Array.from(set).sort()];
  }, [clients]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      if (countryFilter !== "ALL_COUNTRIES" && client.country !== countryFilter) return false;
      if (!query) return true;
      return (
        client.name.toLowerCase().includes(query) ||
        client.domains.toLowerCase().includes(query) ||
        client.brandTerms.toLowerCase().includes(query)
      );
    });
  }, [clients, countryFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE));
  const paginatedClients = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredClients.slice(start, start + PAGE_SIZE);
  }, [filteredClients, page]);

  const globalClients = useMemo(
    () => clients.filter((client) => client.country === "ALL").length,
    [clients]
  );

  useEffect(() => {
    setPage(1);
  }, [search, countryFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header dangerCount={0} />
      <div className="mx-auto max-w-7xl px-4 py-16">
        <SettingsPanel
          health={health}
          onRefresh={async () => {
            await refreshHealth();
          }}
          onClose={() => router.push("/")}
        />

        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Client Management</h2>
              <p className="mt-1 text-sm text-slate-400">
                Remove monitored clients here. Dashboard delete now only clears scan results.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
                <div className="text-xs text-slate-500">Total</div>
                <div className="text-sm font-semibold text-white">{clients.length}</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
                <div className="text-xs text-slate-500">Global</div>
                <div className="text-sm font-semibold text-white">{globalClients}</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
                <div className="text-xs text-slate-500">Filtered</div>
                <div className="text-sm font-semibold text-white">{filteredClients.length}</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_220px]">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by client, domain, or term"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pr-3 pl-9 text-sm text-slate-200 placeholder:text-slate-500"
              />
            </div>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full border-slate-700 bg-slate-800 text-slate-200">
                <SelectValue placeholder="Filter by country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL_COUNTRIES">All countries</SelectItem>
                {countryOptions
                  .filter((code) => code !== "ALL_COUNTRIES")
                  .map((code) => (
                    <SelectItem key={code} value={code}>
                      {code === "ALL" ? "Global (ALL)" : code}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 space-y-2">
            {filteredClients.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-6 text-center">
                <Building2 className="mx-auto mb-2 text-slate-500" size={22} />
                <p className="text-sm text-slate-400">
                  {clients.length === 0 ? "No clients configured yet." : "No clients match the current filters."}
                </p>
              </div>
            ) : (
              paginatedClients.map((client) => (
                <div
                  key={client.id}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-200">{client.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {(client.country === "ALL" ? "Global" : client.country) + " - " + (client.domains || "No domains")}
                      </div>
                      {client.brandTerms && (
                        <div className="mt-1 text-xs text-slate-400">
                          Terms: {client.brandTerms}
                        </div>
                      )}
                    </div>

                    {confirmDeleteId === client.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void deleteClientFromSettings(client.id)}
                          disabled={deletingId === client.id}
                          className="rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                        >
                          {deletingId === client.id ? "Removing..." : "Confirm"}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === client.id}
                          className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(client.id)}
                        className="inline-flex items-center gap-1 rounded bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                      >
                        <Trash2 size={12} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredClients.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 px-3 py-2">
              <div className="text-xs text-slate-400">
                Showing {(page - 1) * PAGE_SIZE + 1}-
                {Math.min(page * PAGE_SIZE, filteredClients.length)} of {filteredClients.length}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-400">
                  Page {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
