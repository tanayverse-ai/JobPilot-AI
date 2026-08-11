import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import AppHeader from "@/components/AppHeader";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import type { ApplicationFormValues, ApplicationPublic } from "@/types/application";

import ApplicationForm from "./ApplicationForm";
import ApplicationTimeline from "./ApplicationTimeline";
import { archiveApplication, getApplication, updateApplication } from "./applicationsApi";
import { applicationToFormValues, formValuesToPayload } from "./formHelpers";

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<ApplicationPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [archivePending, setArchivePending] = useState(false);
  const [timelineVersion, setTimelineVersion] = useState(0);

  useEffect(() => {
    if (!token || !id) return;
    setLoading(true);
    getApplication(token, id)
      .then(setApplication)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(err instanceof ApiError ? err.message : "Couldn't load this application.");
        }
      })
      .finally(() => setLoading(false));
  }, [token, id]);

  if (notFound) {
    return <Navigate to="/applications" replace />;
  }

  async function handleSubmit(values: ApplicationFormValues) {
    if (!token || !id) return;
    setServerError(null);
    try {
      const updated = await updateApplication(token, id, formValuesToPayload(values));
      setApplication(updated);
      setTimelineVersion((version) => version + 1);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    }
  }

  async function handleArchive() {
    if (!token || !id) return;
    setArchivePending(true);
    try {
      await archiveApplication(token, id);
      navigate("/applications", { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Couldn't archive this application.");
    } finally {
      setArchivePending(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6">
          <Link to="/applications" className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
            ← Back to applications
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : loadError ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {loadError}
          </div>
        ) : application ? (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-slate-900">{application.job_title}</h1>
                <p className="mt-1 text-sm text-slate-500">{application.company_name}</p>
              </div>
              <StatusBadge status={application.status} />
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <ApplicationForm
                initialValues={applicationToFormValues(application)}
                onSubmit={handleSubmit}
                submitLabel="Save changes"
                pendingLabel="Saving…"
                serverError={serverError}
                secondaryAction={
                  <button
                    type="button"
                    onClick={handleArchive}
                    disabled={archivePending}
                    className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {archivePending ? "Archiving…" : "Archive"}
                  </button>
                }
              />
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-slate-900">Timeline</h2>
              <ApplicationTimeline key={`${id}-${timelineVersion}`} applicationId={id ?? ""} />
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
