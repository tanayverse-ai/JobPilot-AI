import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/app/AuthContext";
import { ApiError } from "@/lib/apiClient";
import { EMPTY_APPLICATION_FORM_VALUES, type ApplicationFormValues } from "@/types/application";

import ApplicationForm from "./ApplicationForm";
import { createApplication } from "./applicationsApi";
import { formValuesToPayload } from "./formHelpers";

export default function NewApplicationPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  async function handleSubmit(values: ApplicationFormValues) {
    if (!token) return;
    setServerError(null);
    try {
      const created = await createApplication(token, formValuesToPayload(values));
      navigate(`/applications/${created.id}`, { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
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
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">Add a job application</h1>
          <p className="mt-1 text-sm text-slate-500">Track a role you've found, applied to, or are interviewing for.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <ApplicationForm
            initialValues={EMPTY_APPLICATION_FORM_VALUES}
            onSubmit={handleSubmit}
            submitLabel="Add application"
            pendingLabel="Adding…"
            serverError={serverError}
          />
        </div>
      </main>
    </div>
  );
}
