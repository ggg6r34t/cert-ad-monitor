"use client";

import { useCallback, useRef, useState } from "react";
import type { Alert, Client, ScanResult } from "@/types";
import { analyzeAd } from "@/lib/analysis";
import { fetchAds } from "@/services/adsClient";
import { buildClientQueries } from "@/lib/brandQueries";

interface UseScanRunnerInput {
  clients: Client[];
  tokenConfigured: boolean | undefined;
  onAlert: (type: Alert["type"], message: string) => void;
  onClientScanStart: (clientId: string) => void;
}

export function useScanRunner({
  clients,
  tokenConfigured,
  onAlert,
  onClientScanStart,
}: UseScanRunnerInput) {
  const [results, setResults] = useState<Record<string, ScanResult>>({});
  const [scanning, setScanning] = useState(false);
  const scanLock = useRef(false);

  const runScan = useCallback(
    async (client: Client) => {
      if (scanLock.current) return;
      scanLock.current = true;
      setScanning(true);
      onClientScanStart(client.id);

      const useDemo = tokenConfigured === false;
      const queries = buildClientQueries(client.name, client.brandTerms, 8);
      const responses = await Promise.all(
        queries.map((query) =>
          fetchAds({
            query,
            country: client.country,
            allowDemo: useDemo,
            maxPages: 3,
          })
        )
      );
      const firstError = responses.find((r) => r.error)?.error ?? null;
      const dedupAds = new Map<string, (typeof responses)[number]["ads"][number]>();
      for (const response of responses) {
        for (const ad of response.ads) {
          dedupAds.set(ad.id, ad);
        }
      }
      const data = {
        ads: Array.from(dedupAds.values()),
        error: firstError,
        isDemo: responses.some((r) => r.isDemo),
      };

      if (data.error) {
        const failResult: ScanResult = {
          items: [],
          error: data.error,
          isDemo: false,
          timestamp: new Date().toISOString(),
          stats: { total: 0, active: 0, inactive: 0, startedLast7d: 0 },
        };
        setResults((prev) => ({ ...prev, [client.id]: failResult }));
        onAlert("error", `Scan failed for ${client.name}: ${data.error}`);
      } else {
        const activeIds = new Set(
          data.ads.filter((ad) => !ad.ad_delivery_stop_time).map((ad) => ad.id)
        );
        const items = data.ads
          .map((ad) => ({ ad, analysis: analyzeAd(ad, client) }))
          .sort((a, b) => {
            const aActive = !a.ad.ad_delivery_stop_time;
            const bActive = !b.ad.ad_delivery_stop_time;
            if (aActive !== bActive) return aActive ? -1 : 1;
            const aStart = a.ad.ad_delivery_start_time ? new Date(a.ad.ad_delivery_start_time).getTime() : 0;
            const bStart = b.ad.ad_delivery_start_time ? new Date(b.ad.ad_delivery_start_time).getTime() : 0;
            return bStart - aStart;
          });

        const active = items.filter((x) => !x.ad.ad_delivery_stop_time).length;
        const inactive = items.length - active;
        const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const startedLast7d = items.filter((x) => {
          const start = x.ad.ad_delivery_start_time;
          return start ? new Date(start).getTime() >= sevenDaysAgo : false;
        }).length;

        const flaggedActiveIds = new Set(
          items
            .filter((x) => !x.ad.ad_delivery_stop_time && x.analysis.score > 0)
            .map((x) => x.ad.id)
        );

        let changeSummary: ScanResult["changeSummary"] | undefined;
        try {
          const historyRes = await fetch(
            `/api/scan-history?clientId=${encodeURIComponent(client.id)}&limit=1`,
            { cache: "no-store" }
          );
          if (historyRes.ok) {
            const payload = (await historyRes.json()) as {
              scans?: Array<{
                scannedAt: string;
                activeIds: string[];
                flaggedActiveIds: string[];
              }>;
            };
            const previous = payload.scans?.[0];
            if (previous) {
              const previousActive = new Set(previous.activeIds ?? []);
              const previousFlagged = new Set(previous.flaggedActiveIds ?? []);
              const newActive = [...activeIds].filter((id) => !previousActive.has(id)).length;
              const resolvedActive = [...previousActive].filter((id) => !activeIds.has(id)).length;
              const newFlagged = [...flaggedActiveIds].filter((id) => !previousFlagged.has(id)).length;
              changeSummary = {
                previousScanAt: previous.scannedAt,
                newActive,
                resolvedActive,
                newFlagged,
              };
            }
          }
        } catch {
          // ignore history lookup failures
        }

        const scanResult: ScanResult = {
          items,
          error: null,
          isDemo: data.isDemo,
          timestamp: new Date().toISOString(),
          stats: { total: items.length, active, inactive, startedLast7d },
          changeSummary,
        };

        setResults((prev) => ({ ...prev, [client.id]: scanResult }));

        try {
          await fetch("/api/scan-history", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientId: client.id,
              clientName: client.name,
              source: "manual",
              scannedAt: scanResult.timestamp,
              activeIds: Array.from(activeIds),
              flaggedActiveIds: Array.from(flaggedActiveIds),
            }),
          });
        } catch {
          // ignore history persist failures
        }

        if (active > 0) {
          onAlert("info", `${active} active ad(s) currently running for query "${client.name}".`);
        }
      }

      setScanning(false);
      scanLock.current = false;
    },
    [onAlert, onClientScanStart, tokenConfigured]
  );

  const scanAll = useCallback(async () => {
    for (const client of clients) {
      await runScan(client);
      await new Promise((r) => setTimeout(r, 600));
    }
  }, [clients, runScan]);

  return {
    results,
    setResults,
    scanning,
    runScan,
    scanAll,
  };
}
