import { Link, useLocation } from "react-router-dom";

import { useAuth } from "@/app/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/applications", label: "Applications" },
  { to: "/materials", label: "Materials" },
  { to: "/analytics", label: "Analytics" },
  { to: "/integrations", label: "Smart Import" },
];

export default function AppHeader() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-sm font-semibold uppercase tracking-wide text-indigo-600">JobPilot AI</span>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active =
                location.pathname === item.to ||
                (item.to === "/applications" && location.pathname.startsWith("/applications"));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}
