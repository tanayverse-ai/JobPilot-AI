import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "@/app/AuthContext";
import { getGmailStatus, listDetectedApplications } from "@/features/integrations/integrationsApi";

export default function SmartImportBanner() {
  const { token } = useAuth();
  const [connected, setConnected] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) return;
    Promise.all([getGmailStatus(token), listDetectedApplications(token)])
      .then(([status, detected]) => {
        setConnected(status.connected);
        setPendingCount(detected.items.length);
      })
      .catch(() => {
        // Smart Import is optional -- if the connector service hiccups, the
        // rest of the dashboard shouldn't show an error for it.
      })
      .finally(() => setReady(true));
  }, [token]);

  if (!ready) return null;

  if (!connected) {
    return (
      <Link
        to="/integrations"
        className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-4 hover:bg-indigo-100"
      >
        <div>
          <p className="text-sm font-semibold text-indigo-900">Try Smart Import</p>
          <p className="mt-0.5 text-sm text-indigo-700">
            Connect Gmail and let JobPilot AI find applications you've already sent — you review before anything's added.
          </p>
        </div>
        <span className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
          Connect Gmail
        </span>
      </Link>
    );
  }

  if (pendingCount === 0) return null;

  return (
    <Link
      to="/integrations"
      className="mb-8 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-6 py-4 hover:bg-amber-100"
    >
      <div>
        <p className="text-sm font-semibold text-amber-900">
          {pendingCount} application{pendingCount === 1 ? "" : "s"} found in your Gmail
        </p>
        <p className="mt-0.5 text-sm text-amber-700">Review the suggestions Smart Import found.</p>
      </div>
      <span className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm">
        Review now
      </span>
    </Link>
  );
}
