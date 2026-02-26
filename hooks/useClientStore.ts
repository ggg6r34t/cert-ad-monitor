"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Client, TriageStatus } from "@/types";
import { withInternalApiKey } from "@/services/internalApi";

export interface HealthResponse {
  status: "ok" | "degraded";
  tokenConfigured: boolean;
  tokenSource: "env" | "stored" | "none";
  tokenStorageReady: boolean;
  tokenStatusError?: string;
  internalApiKeyConfigured: boolean;
  notifier: {
    slackConfigured: boolean;
    telegramConfigured: boolean;
  };
  automation: {
    enabled: boolean;
    leader: boolean;
    ownerId: string;
    running: boolean;
    intervalMinutes: number;
    queueSize: number;
    lastRun: {
      startedAt: string;
      finishedAt: string;
      clients: Array<{
        clientId: string;
        clientName: string;
        scanned: number;
        active: number;
        flaggedActive: number;
        newFlaggedIds: string[];
        notificationSent: boolean;
      }>;
    } | null;
  };
  datastore: { ok: boolean; path: string; error?: string };
  timestamp: string;
}

interface PersistedStateResponse {
  clients: Client[];
  triageMap: Record<string, TriageStatus>;
  version?: number;
}

function loadLegacyLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useClientStore() {
  const [clients, setClients] = useState<Client[]>([]);
  const [seedTriageMap, setSeedTriageMap] = useState<Record<string, TriageStatus>>({});
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stateVersion, setStateVersion] = useState(0);
  const stateVersionRef = useRef(0);
  const syncingFromServerRef = useRef(false);
  const lastPersistedSignatureRef = useRef("");

  const buildSignature = useCallback(
    (nextClients: Client[], nextTriageMap: Record<string, TriageStatus>) =>
      JSON.stringify({ clients: nextClients, triageMap: nextTriageMap }),
    []
  );

  const applyServerState = useCallback(
    (state: PersistedStateResponse) => {
      syncingFromServerRef.current = true;
      const nextClients = Array.isArray(state.clients) ? state.clients : [];
      const nextTriageMap =
        state.triageMap && typeof state.triageMap === "object" ? state.triageMap : {};
      const nextVersion = typeof state.version === "number" ? state.version : stateVersionRef.current;
      setClients(nextClients);
      setSeedTriageMap(nextTriageMap);
      setStateVersion(nextVersion);
      stateVersionRef.current = nextVersion;
      lastPersistedSignatureRef.current = buildSignature(nextClients, nextTriageMap);
      setTimeout(() => {
        syncingFromServerRef.current = false;
      }, 0);
    },
    [buildSignature]
  );

  const refreshHealth = useCallback(async () => {
    const res = await fetch("/api/health", { cache: "no-store" });
    const data = (await res.json()) as HealthResponse;
    setHealth(data);
    return data;
  }, []);

  const persistState = useCallback(
    async (nextClients: Client[], nextTriageMap: Record<string, TriageStatus>) => {
      if (syncingFromServerRef.current) return;
      const signature = buildSignature(nextClients, nextTriageMap);
      if (signature === lastPersistedSignatureRef.current) return;

      const res = await fetch("/api/state", {
        method: "PUT",
        headers: withInternalApiKey({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          clients: nextClients,
          triageMap: nextTriageMap,
          version: stateVersionRef.current,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as PersistedStateResponse;
        const nextVersion =
          typeof data.version === "number" ? data.version : stateVersionRef.current + 1;
        setStateVersion(nextVersion);
        stateVersionRef.current = nextVersion;
        lastPersistedSignatureRef.current = signature;
        return;
      }
      if (res.status === 409) {
        const latestRes = await fetch("/api/state", {
          cache: "no-store",
          headers: withInternalApiKey(),
        });
        if (latestRes.ok) {
          const latest = (await latestRes.json()) as PersistedStateResponse;
          applyServerState(latest);
        }
      }
    },
    [applyServerState, buildSignature]
  );

  useEffect(() => {
    let active = true;

    async function bootstrap(): Promise<void> {
      try {
        const [stateRes, healthRes] = await Promise.all([
          fetch("/api/state", { cache: "no-store" }),
          // keep health endpoint publicly readable
          fetch("/api/health", { cache: "no-store" }),
        ]);

        const stateData = (await stateRes.json()) as PersistedStateResponse;
        const healthData = (await healthRes.json()) as HealthResponse;

        if (!active) return;
        setHealth(healthData);

        const serverClients = Array.isArray(stateData.clients) ? stateData.clients : [];
        const serverTriage =
          stateData.triageMap && typeof stateData.triageMap === "object"
            ? stateData.triageMap
            : {};
        lastPersistedSignatureRef.current = buildSignature(serverClients, serverTriage);
        if (typeof stateData.version === "number") {
          stateVersionRef.current = stateData.version;
          setStateVersion(stateData.version);
        }

        if (serverClients.length > 0 || Object.keys(serverTriage).length > 0) {
          applyServerState(stateData);
        } else {
          const legacyClients = loadLegacyLocalStorage<Client[]>("cert_clients", []);
          const legacyTriage = loadLegacyLocalStorage<Record<string, TriageStatus>>("cert_triage", {});
          setClients(legacyClients);
          setSeedTriageMap(legacyTriage);
          lastPersistedSignatureRef.current = buildSignature(legacyClients, legacyTriage);
          if (legacyClients.length > 0 || Object.keys(legacyTriage).length > 0) {
            const res = await fetch("/api/state", {
              method: "PUT",
              headers: withInternalApiKey({ "Content-Type": "application/json" }),
              body: JSON.stringify({ clients: legacyClients, triageMap: legacyTriage, version: 0 }),
            });
            if (res.ok) {
              const saved = (await res.json()) as PersistedStateResponse;
              const nextVersion = typeof saved.version === "number" ? saved.version : 0;
              setStateVersion(nextVersion);
              stateVersionRef.current = nextVersion;
            }
          }
        }
      } catch {
        if (!active) return;
        const legacyClients = loadLegacyLocalStorage<Client[]>("cert_clients", []);
        const legacyTriage = loadLegacyLocalStorage<Record<string, TriageStatus>>("cert_triage", {});
        setClients(legacyClients);
        setSeedTriageMap(legacyTriage);
        lastPersistedSignatureRef.current = buildSignature(legacyClients, legacyTriage);
      } finally {
        if (active) setLoaded(true);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [applyServerState, buildSignature]);

  const saveClient = useCallback((client: Client) => {
    setClients((prev) => {
      const exists = prev.find((c) => c.id === client.id);
      return exists ? prev.map((c) => (c.id === client.id ? client : c)) : [...prev, client];
    });
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return {
    clients,
    setClients,
    saveClient,
    deleteClient,
    seedTriageMap,
    health,
    refreshHealth,
    loaded,
    stateVersion,
    setStateVersion,
    persistState,
  };
}
