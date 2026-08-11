import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import {
  SORT_LABELS,
  SORT_OPTIONS_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  type ApplicationPublic,
  type ApplicationStatus,
  type SortOption,
} from "@/types/application";

import ApplicationsBoard from "./ApplicationsBoard";
import { listApplications, updateApplication } from "./applicationsApi";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

type ViewMode = "list" | "board";

export default function ApplicationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ApplicationPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "">("");
  const [sort, setSort] = useState<SortOption>("updated_desc");
  const [view, setView] = useState<ViewMode>("list");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const handle = setTimeout(() => {
      setLoading(true);
      setError(null);
      // The board shows every active application at once (grouped client-side
      // by status), so it fetches a much larger page than the paginated list.
      const limit = view === "board" ? 200 : 50;
      listApplications(token, {
        search: search.trim() || undefined,
        status: view === "list" ? statusFilter || undefined : undefined,
        sort,
        limit,
      })
        .then((response) => {
          setItems(response.items);
          setTotal(response.total);
        })
        .catch((err) => {
          setError(err instanceof ApiError ? err.message : "Couldn't load your applications. Please try again.");
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(handle);
  }, [token, search, statusFilter, sort, view]);

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    if (!token) return;
    setMovingId(id);
    const previous = items;
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    try {
      await updateApplication(token, id, { status });
    } catch (err) {
      setItems(previous);
      setError(err instanceof ApiError ? err.message : "Couldn't update that application's status.");
    } finally {
      setMovingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Applications</h1>
            <p className="mt-1 text-sm text-slate-500">
              {loading ? "Loading…" : `${total} application${total === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link
            to="/applications/new"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            + Add application
          </Link>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Search by company or job title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:max-w-xs"
          />
          {view === "list" ? (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | "")}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All statuses</option>
              {STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          ) : null}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS_ORDER.map((option) => (
              <option key={option} value={option}>
                {SORT_LABELS[option]}
              </option>
            ))}
          </select>

          <div className="ml-auto flex rounded-lg border border-slate-300 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => setView("board")}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === "board" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Board
            </button>
          </div>
        </div>

        {error ? (
          <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {view === "board" ? (
          loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <ApplicationsBoard items={items} onStatusChange={handleStatusChange} movingId={movingId} />
          )
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {!loading && items.length === 0 && !error ? (
              <div className="px-6 py-12 text-center">
                <p className="text-sm font-medium text-slate-900">No applications yet</p>
                <p className="mt-1 text-sm text-slate-500">
                  {search || statusFilter
                    ? "No applications match your filters."
                    : "Add the first job you're tracking to get started."}
                </p>
                {!search && !statusFilter ? (
                  <Link
                    to="/applications/new"
                    className="mt-4 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                  >
                    + Add application
                  </Link>
                ) : null}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {items.map((item) => (
                  <li key={item.id}>
                    <Link to={`/applications/${item.id}`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{item.job_title}</p>
                        <p className="truncate text-sm text-slate-500">
                          {item.company_name}
                          {item.location ? ` · ${item.location}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-4">
                        <span className="hidden text-xs text-slate-400 sm:inline">Updated {formatDate(item.updated_at)}</span>
                        <StatusBadge status={item.status} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
