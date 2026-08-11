import { useEffect, useState } from "react";

import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { STATUS_LABELS, type ApplicationEvent, type ApplicationStatus } from "@/types/application";

import { getApplicationEvents } from "./applicationsApi";

function describeEvent(event: ApplicationEvent): string {
  const metadata = event.metadata ?? {};
  switch (event.event_type) {
    case "created":
      return "Application added";
    case "archived":
      return "Application archived";
    case "status_changed": {
      const from = metadata.from as ApplicationStatus | undefined;
      const to = metadata.to as ApplicationStatus | undefined;
      const fromLabel = from ? STATUS_LABELS[from] ?? from : "—";
      const toLabel = to ? STATUS_LABELS[to] ?? to : "—";
      return `Status changed: ${fromLabel} → ${toLabel}`;
    }
    case "updated":
      return "Details updated";
    default:
      return "Updated";
  }
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ApplicationTimeline({ applicationId }: { applicationId: string }) {
  const { token } = useAuth();
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    getApplicationEvents(token, applicationId)
      .then((response) => setEvents(response.items))
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Couldn't load the timeline.");
      })
      .finally(() => setLoading(false));
  }, [token, applicationId]);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading timeline…</p>;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-slate-500">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event, index) => (
        <li key={event.id} className="relative flex gap-3 pl-1">
          <div className="flex flex-col items-center">
            <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${index === 0 ? "bg-indigo-600" : "bg-slate-300"}`} />
            {index < events.length - 1 ? <span className="mt-1 w-px flex-1 bg-slate-200" /> : null}
          </div>
          <div className="pb-4">
            <p className="text-sm font-medium text-slate-900">{describeEvent(event)}</p>
            <p className="text-xs text-slate-500">{formatTimestamp(event.occurred_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
