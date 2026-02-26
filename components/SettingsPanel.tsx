"use client";

import { useEffect, useState } from "react";
import { ExternalLink, RefreshCw, Settings, Play } from "lucide-react";
import {
  getUserMetaTokenOverride,
  setUserMetaTokenOverride,
} from "@/services/userMetaToken";

export interface HealthModel {
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

interface AutomationStatusResponse {
  enabled: boolean;
  leader: boolean;
  ownerId: string;
  running: boolean;
  intervalMinutes: number;
  queueSize: number;
  lastRun: HealthModel["automation"]["lastRun"];
  recentRuns: Array<{
    startedAt: string;
    finishedAt: string;
    clientsScanned: number;
    failures: number;
    activeTotal: number;
    flaggedTotal: number;
    newFlaggedTotal: number;
  }>;
  alertPolicy?: {
    channels: {
      slack: boolean;
      telegram: boolean;
    };
    minNewFlaggedForAlert: number;
    quietHoursUtc: {
      enabled: boolean;
      startHour: number;
      endHour: number;
    };
  };
  runtimeConfig?: {
    enabled: boolean;
    intervalMinutes: number;
    maxPages: number;
    maxQueries: number;
  };
  schedulerAllowedByEnv?: boolean;
}

interface Props {
  health: HealthModel | null;
  onRefresh: () => Promise<void>;
  onClose: () => void;
}

export default function SettingsPanel({ health, onRefresh, onClose }: Props) {
  const [internalKey, setInternalKey] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenMessage, setTokenMessage] = useState<string | null>(null);
  const [userTokenInput, setUserTokenInput] = useState("");
  const [userTokenMessage, setUserTokenMessage] = useState<string | null>(null);
  const [runBusy, setRunBusy] = useState(false);
  const [runMessage, setRunMessage] = useState<string | null>(null);
  const [automationStatus, setAutomationStatus] = useState<AutomationStatusResponse | null>(null);
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policyMessage, setPolicyMessage] = useState<string | null>(null);
  const [runtimeBusy, setRuntimeBusy] = useState(false);
  const [runtimeMessage, setRuntimeMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cert_internal_api_key") ?? "";
      setInternalKey(saved);
    } catch {
      setInternalKey("");
    }
    setUserTokenInput(getUserMetaTokenOverride());
  }, []);

  useEffect(() => {
    if (!internalKey) return;
    const loadStatus = async () => {
      try {
        const res = await fetch("/api/automation/status", {
          headers: { "x-internal-api-key": internalKey },
        });
        if (!res.ok) return;
        const data = (await res.json()) as AutomationStatusResponse;
        setAutomationStatus(data);
      } catch {
        // ignore background status refresh failures
      }
    };
    void loadStatus();
  }, [internalKey]);

  const saveInternalKey = (value: string) => {
    setInternalKey(value);
    try {
      localStorage.setItem("cert_internal_api_key", value);
    } catch {
      // ignore storage failures
    }
  };

  const refreshEverything = async () => {
    await onRefresh();
    if (!internalKey) return;
    const statusRes = await fetch("/api/automation/status", {
      headers: { "x-internal-api-key": internalKey },
    });
    if (statusRes.ok) {
      const status = (await statusRes.json()) as AutomationStatusResponse;
      setAutomationStatus(status);
    }
  };

  const runAutomationNow = async () => {
    setRunBusy(true);
    setRunMessage(null);
    try {
      const res = await fetch("/api/automation/run", {
        method: "POST",
        headers: { "x-internal-api-key": internalKey },
      });
      const data = await res.json();
      if (!res.ok) {
        setRunMessage(data.error ?? data.message ?? `Run failed (${res.status})`);
      } else {
        setRunMessage("Automation run started/completed successfully.");
      }
      await refreshEverything();
    } catch (err) {
      setRunMessage(err instanceof Error ? err.message : "Automation request failed");
    } finally {
      setRunBusy(false);
    }
  };

  const saveAlertPolicy = async () => {
    if (!automationStatus?.alertPolicy) return;
    setPolicyBusy(true);
    setPolicyMessage(null);
    try {
      const res = await fetch("/api/automation/policy", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalKey,
        },
        body: JSON.stringify(automationStatus.alertPolicy),
      });
      const data = await res.json();
      if (!res.ok) {
        setPolicyMessage(data.error ?? `Policy save failed (${res.status})`);
      } else {
        setPolicyMessage("Alert routing policy saved.");
      }
      await refreshEverything();
    } catch (err) {
      setPolicyMessage(err instanceof Error ? err.message : "Policy save request failed");
    } finally {
      setPolicyBusy(false);
    }
  };

  const saveTokenServerSide = async () => {
    setTokenBusy(true);
    setTokenMessage(null);
    try {
      const res = await fetch("/api/settings/meta-token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalKey,
        },
        body: JSON.stringify({ token: tokenInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenMessage(data.error ?? `Token save failed (${res.status})`);
      } else {
        setTokenInput("");
        setTokenMessage("Token saved securely on server.");
      }
      await refreshEverything();
    } catch (err) {
      setTokenMessage(err instanceof Error ? err.message : "Token save request failed");
    } finally {
      setTokenBusy(false);
    }
  };

  const clearTokenServerSide = async () => {
    setTokenBusy(true);
    setTokenMessage(null);
    try {
      const res = await fetch("/api/settings/meta-token", {
        method: "DELETE",
        headers: { "x-internal-api-key": internalKey },
      });
      const data = await res.json();
      if (!res.ok) {
        setTokenMessage(data.error ?? `Token clear failed (${res.status})`);
      } else {
        setTokenMessage("Stored token cleared.");
      }
      await refreshEverything();
    } catch (err) {
      setTokenMessage(err instanceof Error ? err.message : "Token clear request failed");
    } finally {
      setTokenBusy(false);
    }
  };

  const saveRuntimeConfig = async () => {
    if (!automationStatus?.runtimeConfig) return;
    setRuntimeBusy(true);
    setRuntimeMessage(null);
    try {
      const res = await fetch("/api/automation/runtime", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-internal-api-key": internalKey,
        },
        body: JSON.stringify(automationStatus.runtimeConfig),
      });
      const data = await res.json();
      if (!res.ok) {
        setRuntimeMessage(data.error ?? `Runtime config save failed (${res.status})`);
      } else {
        setRuntimeMessage("Scheduler runtime overrides saved.");
      }
      await refreshEverything();
    } catch (err) {
      setRuntimeMessage(err instanceof Error ? err.message : "Runtime config save request failed");
    } finally {
      setRuntimeBusy(false);
    }
  };

  const saveUserTokenOverride = () => {
    const trimmed = userTokenInput.trim();
    if (!trimmed) {
      setUserTokenMessage("Enter a token or clear the override.");
      return;
    }
    setUserMetaTokenOverride(trimmed);
    setUserTokenMessage("Personal scan token saved for this browser session.");
  };

  const clearUserTokenOverride = () => {
    setUserMetaTokenOverride("");
    setUserTokenInput("");
    setUserTokenMessage("Personal override cleared. Shared server token will be used.");
  };

  return (
    <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
        <Settings size={18} className="text-slate-400" /> Runtime Configuration
      </h2>

      <div className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Meta Token</div>
          <div className={health?.tokenConfigured ? "text-emerald-400" : "text-amber-400"}>
            {health?.tokenConfigured ? "Configured (server-side)" : "Missing (demo mode only)"}
          </div>
          <div className="mt-1 text-xs text-slate-500">Source: {health?.tokenSource ?? "none"}</div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Datastore</div>
          <div className={health?.datastore.ok ? "text-emerald-400" : "text-red-400"}>
            {health?.datastore.ok ? "Writable" : "Unavailable"}
          </div>
          <div className="mt-1 break-all text-xs text-slate-500">{health?.datastore.path ?? "N/A"}</div>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Automation</div>
          <div className={health?.automation.enabled ? "text-emerald-400" : "text-amber-400"}>
            {health?.automation.enabled ? "Enabled" : "Disabled"}
          </div>
          <div className="mt-1 text-xs text-slate-500">Interval: {health?.automation.intervalMinutes ?? "N/A"} min</div>
          <div className="text-xs text-slate-500">
            Leader: {health?.automation.leader ? "Yes" : "No"} | Running: {health?.automation.running ? "Yes" : "No"}
          </div>
        </div>
      </div>

      {!health?.datastore.ok && health?.datastore.error && (
        <p className="mt-3 rounded-lg border border-red-900 bg-red-950 p-2 text-xs text-red-300">{health.datastore.error}</p>
      )}

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3 text-xs text-slate-400">
        <p>
          Add and manage the Meta API token here so scans run with your team’s shared server configuration.
        </p>
        <p className="mt-2">
          If both env and stored token exist, stored token is used as the shared default.
        </p>
        <p className="mt-2">If token source is <code>none</code>, add it via secure save below or env and refresh.</p>
        {health?.tokenStatusError && <p className="mt-2 text-amber-400">{health.tokenStatusError}</p>}
        <a
          href="https://www.facebook.com/ads/library/api/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-red-400 hover:text-red-300"
        >
          <ExternalLink size={10} /> Meta Ad Library API documentation
        </a>
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Automation Controls</div>
        <label className="mt-2 block text-xs text-slate-400">Internal API Key</label>
        <input
          type="password"
          value={internalKey}
          onChange={(e) => saveInternalKey(e.target.value)}
          placeholder="Matches INTERNAL_API_KEY"
          className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
        />
      </div>

      {automationStatus?.runtimeConfig && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Scheduler Runtime Overrides</div>
          {!automationStatus.schedulerAllowedByEnv && (
            <p className="mt-2 text-xs text-amber-400">
              AUTO_SCAN_ENABLED is false in env. Scheduler cannot be enabled until env allows it.
            </p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={automationStatus.runtimeConfig.enabled}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          runtimeConfig: { ...prev.runtimeConfig!, enabled: e.target.checked },
                        }
                      : prev
                  )
                }
              />
              Enable scheduled scans
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-slate-400">
              Interval (minutes)
              <input
                type="number"
                min={1}
                max={360}
                value={automationStatus.runtimeConfig.intervalMinutes}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          runtimeConfig: {
                            ...prev.runtimeConfig!,
                            intervalMinutes: Math.min(360, Math.max(1, Number(e.target.value || 1))),
                          },
                        }
                      : prev
                  )
                }
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
            </label>
            <label className="text-xs text-slate-400">
              Max pages per query
              <input
                type="number"
                min={1}
                max={10}
                value={automationStatus.runtimeConfig.maxPages}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          runtimeConfig: {
                            ...prev.runtimeConfig!,
                            maxPages: Math.min(10, Math.max(1, Number(e.target.value || 1))),
                          },
                        }
                      : prev
                  )
                }
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
            </label>
            <label className="text-xs text-slate-400">
              Max queries per client
              <input
                type="number"
                min={1}
                max={25}
                value={automationStatus.runtimeConfig.maxQueries}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          runtimeConfig: {
                            ...prev.runtimeConfig!,
                            maxQueries: Math.min(25, Math.max(1, Number(e.target.value || 1))),
                          },
                        }
                      : prev
                  )
                }
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
            </label>
          </div>
          <div className="mt-3">
            <button
              onClick={() => void saveRuntimeConfig()}
              disabled={!internalKey || runtimeBusy}
              className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {runtimeBusy ? "Saving..." : "Save Runtime Overrides"}
            </button>
            {runtimeMessage && <p className="mt-2 text-xs text-slate-300">{runtimeMessage}</p>}
          </div>
        </div>
      )}

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Meta Token (Secure Server Storage)</div>
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Paste META_AD_LIBRARY_TOKEN"
          className="mt-2 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => void saveTokenServerSide()}
            disabled={tokenBusy || !tokenInput || !internalKey}
            className="rounded bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {tokenBusy ? "Saving..." : "Save Token"}
          </button>
          <button
            onClick={() => void clearTokenServerSide()}
            disabled={tokenBusy || !internalKey}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            Clear Stored Token
          </button>
        </div>
        {tokenMessage && <p className="mt-2 text-xs text-slate-300">{tokenMessage}</p>}
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">My Personal Scan Token (Browser Session)</div>
        <p className="mt-1 text-xs text-slate-400">
          Use this to run manual scans with your own token without changing the team default.
        </p>
        <input
          type="password"
          value={userTokenInput}
          onChange={(e) => setUserTokenInput(e.target.value)}
          placeholder="Optional personal override token"
          className="mt-2 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1.5 text-xs text-slate-200"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={saveUserTokenOverride}
            className="rounded bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Save My Override
          </button>
          <button
            onClick={clearUserTokenOverride}
            className="rounded bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white"
          >
            Clear My Override
          </button>
        </div>
        {userTokenMessage && <p className="mt-2 text-xs text-slate-300">{userTokenMessage}</p>}
      </div>

      <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
        <div className="text-xs uppercase tracking-wide text-slate-500">Run Automation</div>
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={() => void runAutomationNow()}
            disabled={runBusy || !internalKey}
            className="inline-flex items-center gap-1 rounded bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            <Play size={11} /> {runBusy ? "Running..." : "Run Automation Now"}
          </button>
          <span className="text-xs text-slate-500">Queue: {health?.automation.queueSize ?? 0}</span>
        </div>
        {runMessage && <p className="mt-2 text-xs text-slate-300">{runMessage}</p>}
        {health && !health.internalApiKeyConfigured && (
          <p className="mt-2 text-xs text-amber-400">
            INTERNAL_API_KEY is not configured on the server yet, so automation endpoints are blocked.
          </p>
        )}
      </div>

      {automationStatus && automationStatus.recentRuns.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Automation Trend (Recent Runs)</div>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-full text-xs text-slate-300">
              <thead>
                <tr className="text-slate-500">
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-right">Clients</th>
                  <th className="px-2 py-1 text-right">Active</th>
                  <th className="px-2 py-1 text-right">Flagged</th>
                  <th className="px-2 py-1 text-right">New</th>
                  <th className="px-2 py-1 text-right">Failures</th>
                </tr>
              </thead>
              <tbody>
                {automationStatus.recentRuns.slice(0, 8).map((run) => (
                  <tr key={run.startedAt} className="border-t border-slate-700">
                    <td className="px-2 py-1">{new Date(run.startedAt).toLocaleString()}</td>
                    <td className="px-2 py-1 text-right">{run.clientsScanned}</td>
                    <td className="px-2 py-1 text-right">{run.activeTotal}</td>
                    <td className="px-2 py-1 text-right">{run.flaggedTotal}</td>
                    <td className="px-2 py-1 text-right">{run.newFlaggedTotal}</td>
                    <td className="px-2 py-1 text-right">{run.failures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {automationStatus?.alertPolicy && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Alert Routing Policy</div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={automationStatus.alertPolicy.channels.slack}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          alertPolicy: {
                            ...prev.alertPolicy!,
                            channels: { ...prev.alertPolicy!.channels, slack: e.target.checked },
                          },
                        }
                      : prev
                  )
                }
              />
              Slack channel enabled
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-300">
              <input
                type="checkbox"
                checked={automationStatus.alertPolicy.channels.telegram}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          alertPolicy: {
                            ...prev.alertPolicy!,
                            channels: { ...prev.alertPolicy!.channels, telegram: e.target.checked },
                          },
                        }
                      : prev
                  )
                }
              />
              Telegram channel enabled
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-slate-400">
              Min new flagged for alert
              <input
                type="number"
                min={1}
                value={automationStatus.alertPolicy.minNewFlaggedForAlert}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          alertPolicy: {
                            ...prev.alertPolicy!,
                            minNewFlaggedForAlert: Math.max(1, Number(e.target.value || 1)),
                          },
                        }
                      : prev
                  )
                }
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
            </label>
            <label className="text-xs text-slate-400">
              Quiet hours start (UTC)
              <input
                type="number"
                min={0}
                max={23}
                value={automationStatus.alertPolicy.quietHoursUtc.startHour}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          alertPolicy: {
                            ...prev.alertPolicy!,
                            quietHoursUtc: {
                              ...prev.alertPolicy!.quietHoursUtc,
                              startHour: Math.min(23, Math.max(0, Number(e.target.value || 0))),
                            },
                          },
                        }
                      : prev
                  )
                }
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
            </label>
            <label className="text-xs text-slate-400">
              Quiet hours end (UTC)
              <input
                type="number"
                min={0}
                max={23}
                value={automationStatus.alertPolicy.quietHoursUtc.endHour}
                onChange={(e) =>
                  setAutomationStatus((prev) =>
                    prev
                      ? {
                          ...prev,
                          alertPolicy: {
                            ...prev.alertPolicy!,
                            quietHoursUtc: {
                              ...prev.alertPolicy!.quietHoursUtc,
                              endHour: Math.min(23, Math.max(0, Number(e.target.value || 0))),
                            },
                          },
                        }
                      : prev
                  )
                }
                className="mt-1 w-full rounded border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-200"
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={automationStatus.alertPolicy.quietHoursUtc.enabled}
              onChange={(e) =>
                setAutomationStatus((prev) =>
                  prev
                    ? {
                        ...prev,
                        alertPolicy: {
                          ...prev.alertPolicy!,
                          quietHoursUtc: {
                            ...prev.alertPolicy!.quietHoursUtc,
                            enabled: e.target.checked,
                          },
                        },
                      }
                    : prev
                )
              }
            />
            Enable quiet hours suppression
          </label>
          <div className="mt-3">
            <button
              onClick={() => void saveAlertPolicy()}
              disabled={!internalKey || policyBusy}
              className="rounded bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              {policyBusy ? "Saving..." : "Save Alert Policy"}
            </button>
            {policyMessage && <p className="mt-2 text-xs text-slate-300">{policyMessage}</p>}
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => void refreshEverything()}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-600"
        >
          <RefreshCw size={14} /> Refresh Health
        </button>
        <button
          onClick={onClose}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700"
        >
          Done
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">Last health check: {health ? new Date(health.timestamp).toLocaleString() : "N/A"}</p>
    </div>
  );
}
