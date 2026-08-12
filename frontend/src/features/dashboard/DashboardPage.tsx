import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { STATUS_LABELS, type ApplicationsSummary } from "@/types/application";
import { getApplicationsSummary } from "@/features/applications/applicationsApi";

import RemindersWidget from "./RemindersWidget";
import StageFunnel from "./StageFunnel";

const SUMMARY_CARDS: Array<{ key: keyof ApplicationsSummary["stage_counts"]; label: string }> = [
  { key: "applied", label: STATUS_LABELS.applied },
  { key: "screening", label: STATUS_LABELS.screening },
  { key: "interviewing", label: STATUS_LABELS.interviewing },
  { key: "offer", label: STATUS_LABELS.offer },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const [summary, setSummary] = useState<ApplicationsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getApplicationsSummary(token)
      .then(setSummary)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Couldn't load your dashboard. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user?.display_name}</h1>
            <p className="mt-1 text-sm text-slate-500">Here's where your job search stands.</p>
          </div>
          <Link
            to="/applications/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Add application
          </Link>
        </div>

        {error ? (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : summary ? (
          <>
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">Active</p>
                <p className="mt-1 text-2xl font-semibold text-indigo-900">{summary.total_active}</p>
              </div>
              {SUMMARY_CARDS.map((card) => (
                <div key={card.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">{summary.stage_counts[card.key]}</p>
                </div>
              ))}
            </div>

            <RemindersWidget />

            <div className="mb-8">
              <StageFunnel stageCounts={summary.stage_counts} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Recently updated</h2>
                <Link to="/applications" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  View all
                </Link>
              </div>
              {summary.recent.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm font-medium text-slate-900">No applications yet</p>
                  <p className="mt-1 text-sm text-slate-500">Add the first job you're tracking to get started.</p>
                  <Link
                    to="/applications/new"
                    className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    + Add application
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {summary.recent.map((item) => (
                    <li key={item.id}>
                      <Link
                        to={`/applications/${item.id}`}
                        className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{item.job_title}</p>
                          <p className="truncate text-sm text-slate-500">{item.company_name}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-4">
                          <span className="hidden text-xs text-slate-400 sm:inline">
                            Updated {formatDate(item.updated_at)}
                          </span>
                          <StatusBadge status={item.status} />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
