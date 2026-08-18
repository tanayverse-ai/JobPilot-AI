import { useCallback, useEffect, useState } from "react";

import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { STATUS_LABELS, STATUS_ORDER, type ApplicationStatus } from "@/types/application";
import type { DetectedApplicationPublic, GmailConnectionStatus } from "@/types/integration";

import {
  confirmDetection,
  disconnectGmail,
  getGmailConnectUrl,
  getGmailStatus,
  listDetectedApplications,
  rejectDetection,
  syncGmail,
} from "./integrationsApi";

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const style =
    confidence >= 0.8
      ? "bg-emerald-100 text-emerald-700"
      : confidence >= 0.6
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${style}`}>
      {pct}% match
    </span>
  );
}

interface DetectionRowProps {
  item: DetectedApplicationPublic;
  onConfirm: (id: string, edits: { company_name: string; job_title: string; status: ApplicationStatus }) => void;
  onReject: (id: string) => void;
  busy: boolean;
}

function DetectionRow({ item, onConfirm, onReject, busy }: DetectionRowProps) {
  const [companyName, setCompanyName] = useState(item.company_name);
  const [jobTitle, setJobTitle] = useState(item.job_title);
  const [status, setStatus] = useState<ApplicationStatus>(item.detected_status);

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-slate-400">
            From your inbox: "{item.source_subject}" · {formatDateTime(item.source_received_at)}
          </p>
        </div>
        <ConfidenceBadge confidence={item.confidence} />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Company</span>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Job title</span>
          <input
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ApplicationStatus)}
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !companyName.trim() || !jobTitle.trim()}
          onClick={() => onConfirm(item.id, { company_name: companyName.trim(), job_title: jobTitle.trim(), status })}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Confirm &amp; add
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onReject(item.id)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Not a match
        </button>
      </div>
    </li>
  );
}

export default function IntegrationsPage() {
  const { token } = useAuth();
  const [status, setStatus] = useState<GmailConnectionStatus | null>(null);
  const [items, setItems] = useState<DetectedApplicationPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [statusRes, detectedRes] = await Promise.all([getGmailStatus(token), listDetectedApplications(token)]);
      setStatus(statusRes);
      setItems(detectedRes.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load Smart Import. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // The OAuth flow runs in a popup rather than a top-level redirect, because
  // this app's session token lives only in memory (see AuthContext) -- a
  // full-page navigation away to Google would silently log the user out.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      const type = (event.data as { type?: string } | null)?.type;
      if (type === "gmail-connected") {
        setNotice("Gmail connected! You can sync now.");
        loadAll();
      } else if (type === "gmail-connect-failed") {
        setError("Couldn't connect Gmail. Please try again.");
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [loadAll]);

  async function handleConnect() {
    if (!token) return;
    setConnecting(true);
    setError(null);
    try {
      const { auth_url } = await getGmailConnectUrl(token);
      const popup = window.open(auth_url, "gmail-connect", "width=480,height=640");
      if (!popup) {
        setError("Your browser blocked the popup. Please allow popups for this site and try again.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't start Gmail connection. Please try again.");
    } finally {
      setConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!token) return;
    setError(null);
    try {
      await disconnectGmail(token);
      setNotice("Gmail disconnected.");
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't disconnect Gmail. Please try again.");
    }
  }

  async function handleSync() {
    if (!token) return;
    setSyncing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await syncGmail(token);
      setNotice(
        result.new_detections > 0
          ? `Scanned ${result.scanned} emails — found ${result.new_detections} new possible application${
              result.new_detections === 1 ? "" : "s"
            }.`
          : `Scanned ${result.scanned} emails — nothing new since last sync.`,
      );
      await loadAll();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleConfirm(
    id: string,
    edits: { company_name: string; job_title: string; status: ApplicationStatus },
  ) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await confirmDetection(token, id, edits);
      setItems((prev) => prev.filter((i) => i.id !== id));
      setNotice("Added to your applications.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add this application. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(id: string) {
    if (!token) return;
    setBusyId(id);
    setError(null);
    try {
      await rejectDetection(token, id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't dismiss this suggestion. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">Smart Import</h1>
          <p className="mt-1 text-sm text-slate-500">
            Connect Gmail and JobPilot AI will scan for application-related emails and suggest applications to add —
            you always review and confirm before anything is saved.
          </p>
        </div>

        {error ? (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {notice ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {notice}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {status?.connected ? `Connected as ${status.email_address}` : "Gmail not connected"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {status?.connected
                      ? `Last synced: ${formatDateTime(status.last_synced_at)}`
                      : "We only ever read email metadata to look for application confirmations — nothing is sent or deleted."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {status?.connected ? (
                    <>
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={handleSync}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {syncing ? "Syncing…" : "Sync now"}
                      </button>
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={connecting}
                      onClick={handleConnect}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {connecting ? "Opening Google…" : "Connect Gmail"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Suggested applications {items.length > 0 ? `(${items.length})` : ""}
                </h2>
              </div>
              {items.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">Nothing to review</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {status?.connected
                      ? "Run a sync to look for new application emails."
                      : "Connect Gmail and run a sync to see suggestions here."}
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <DetectionRow
                      key={item.id}
                      item={item}
                      onConfirm={handleConfirm}
                      onReject={handleReject}
                      busy={busyId === item.id}
                    />
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
