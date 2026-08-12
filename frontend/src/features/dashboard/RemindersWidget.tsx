import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import type { ApplicationPublic } from "@/types/application";

import { getReminders } from "../applications/applicationsApi";

function daysUntil(iso: string): number {
  const now = new Date();
  const target = new Date(iso);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((target.getTime() - now.getTime()) / msPerDay);
}

function ReminderBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
        {Math.abs(days)} day{Math.abs(days) === 1 ? "" : "s"} overdue
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        Due today
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
      Due in {days} day{days === 1 ? "" : "s"}
    </span>
  );
}

export default function RemindersWidget() {
  const { token } = useAuth();
  const [items, setItems] = useState<ApplicationPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getReminders(token)
      .then((response) => setItems(response.items))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Couldn't load reminders.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || error || items.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Upcoming &amp; overdue</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              to={`/applications/${item.id}`}
              className="flex items-center justify-between gap-4 px-6 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{item.job_title}</p>
                <p className="truncate text-xs text-slate-500">{item.company_name}</p>
              </div>
              {item.next_action_at ? <ReminderBadge days={daysUntil(item.next_action_at)} /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
