import { Link } from "react-router-dom";

import { STATUS_LABELS, STATUS_ORDER, type ApplicationPublic, type ApplicationStatus } from "@/types/application";

interface ApplicationsBoardProps {
  items: ApplicationPublic[];
  onStatusChange: (id: string, status: ApplicationStatus) => void;
  movingId: string | null;
}

export default function ApplicationsBoard({ items, onStatusChange, movingId }: ApplicationsBoardProps) {
  const columns = STATUS_ORDER.map((status) => ({
    status,
    items: items.filter((item) => item.status === status),
  }));

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((column) => (
        <div key={column.status} className="w-64 shrink-0">
          <div className="mb-2 flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {STATUS_LABELS[column.status]}
            </h3>
            <span className="text-xs font-medium text-slate-400">{column.items.length}</span>
          </div>
          <div className="space-y-2 rounded-xl bg-slate-100 p-2">
            {column.items.length === 0 ? (
              <p className="px-2 py-4 text-center text-xs text-slate-400">No applications</p>
            ) : (
              column.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                  <Link to={`/applications/${item.id}`} className="block">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.job_title}</p>
                    <p className="truncate text-xs text-slate-500">{item.company_name}</p>
                  </Link>
                  <select
                    value={item.status}
                    onChange={(e) => onStatusChange(item.id, e.target.value as ApplicationStatus)}
                    disabled={movingId === item.id}
                    className="mt-2 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {STATUS_ORDER.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
