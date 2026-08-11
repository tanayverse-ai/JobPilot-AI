import { STATUS_LABELS, STATUS_ORDER, type ApplicationsSummary } from "@/types/application";

const BAR_COLORS: Record<string, string> = {
  saved: "bg-slate-400",
  applied: "bg-blue-500",
  screening: "bg-amber-500",
  interviewing: "bg-purple-500",
  offer: "bg-emerald-500",
  rejected: "bg-red-400",
  withdrawn: "bg-slate-300",
};

export default function StageFunnel({ stageCounts }: { stageCounts: ApplicationsSummary["stage_counts"] }) {
  const max = Math.max(1, ...STATUS_ORDER.map((status) => stageCounts[status]));
  const total = STATUS_ORDER.reduce((sum, status) => sum + stageCounts[status], 0);

  if (total === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">Pipeline by stage</h2>
      <div className="space-y-3">
        {STATUS_ORDER.map((status) => {
          const count = stageCounts[status];
          const widthPercent = Math.max(count > 0 ? 4 : 0, (count / max) * 100);
          return (
            <div key={status} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-xs font-medium text-slate-600">{STATUS_LABELS[status]}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[status]}`}
                  style={{ width: `${widthPercent}%` }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs font-semibold text-slate-700">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
