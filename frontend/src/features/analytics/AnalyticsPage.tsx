import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import type { ActivityTrendPoint, ResponseRateResponse } from "@/types/analytics";

import { getActivityTrend, getResponseRate } from "./analyticsApi";

function formatTickDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ResponseRateCard({ data }: { data: ResponseRateResponse }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-sm font-semibold text-slate-900">Response rate</h2>
      <p className="mb-4 text-xs text-slate-500">
        Share of submitted applications that got any response (screening, interview, offer, or rejection).
      </p>
      <div className="flex items-end gap-2">
        <span className="text-4xl font-semibold text-slate-900">{data.rate}%</span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, data.rate)}%` }} />
      </div>
      <p className="mt-3 text-xs text-slate-500">
        {data.responded} of {data.submitted} submitted application{data.submitted === 1 ? "" : "s"} responded to.
      </p>
    </div>
  );
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [points, setPoints] = useState<ActivityTrendPoint[]>([]);
  const [responseRate, setResponseRate] = useState<ResponseRateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    Promise.all([getActivityTrend(token, 30), getResponseRate(token)])
      .then(([trend, rate]) => {
        setPoints(trend.points);
        setResponseRate(rate);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Couldn't load analytics. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const chartData = points.map((p) => ({ ...p, label: formatTickDate(p.date) }));

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-slate-900">Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Trends and response metrics from your own applications.</p>
        </div>

        {error ? (
          <div role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-1 text-sm font-semibold text-slate-900">Activity (last 30 days)</h2>
              <p className="mb-4 text-xs text-slate-500">
                Applications added, status changes, and edits, per day.
              </p>
              {chartData.every((p) => p.count === 0) ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  No activity yet — add or update an application to see it here.
                </p>
              ) : (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <defs>
                        <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        interval="preserveStartEnd"
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={false}
                      />
                      <YAxis
                        allowDecimals={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
                        labelFormatter={(label) => label}
                        formatter={(value: number) => [value, "Events"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        fill="url(#activityGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {responseRate ? <ResponseRateCard data={responseRate} /> : null}
          </div>
        )}
      </main>
    </div>
  );
}
