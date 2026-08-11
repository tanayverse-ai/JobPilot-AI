import type { ApplicationFormValues, ApplicationPayload, ApplicationPublic } from "@/types/application";

/** ISO datetime -> `yyyy-mm-dd` for a native `<input type="date">`. */
function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

/** `yyyy-mm-dd` from a date input -> ISO datetime, or null if left blank. */
function fromDateInputValue(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export function applicationToFormValues(application: ApplicationPublic): ApplicationFormValues {
  return {
    company_name: application.company_name,
    job_title: application.job_title,
    status: application.status,
    job_url: application.job_url ?? "",
    location: application.location ?? "",
    workplace_type: application.workplace_type ?? "",
    salary: application.salary ?? "",
    job_description: application.job_description ?? "",
    notes: application.notes ?? "",
    applied_at: toDateInputValue(application.applied_at),
    next_action_at: toDateInputValue(application.next_action_at),
  };
}

export function formValuesToPayload(values: ApplicationFormValues): ApplicationPayload {
  return {
    company_name: values.company_name.trim(),
    job_title: values.job_title.trim(),
    status: values.status,
    job_url: values.job_url.trim() || null,
    location: values.location.trim() || null,
    workplace_type: values.workplace_type || null,
    salary: values.salary.trim() || null,
    job_description: values.job_description.trim() || null,
    notes: values.notes.trim() || null,
    applied_at: fromDateInputValue(values.applied_at),
    next_action_at: fromDateInputValue(values.next_action_at),
  };
}

export function validateFormValues(values: ApplicationFormValues): Partial<Record<keyof ApplicationFormValues, string>> {
  const errors: Partial<Record<keyof ApplicationFormValues, string>> = {};

  if (values.company_name.trim().length < 2) {
    errors.company_name = "Company name must be at least 2 characters.";
  }
  if (values.job_title.trim().length < 2) {
    errors.job_title = "Job title must be at least 2 characters.";
  }
  if (values.job_url.trim() && !/^https?:\/\//i.test(values.job_url.trim())) {
    errors.job_url = "Job URL must start with http:// or https://";
  }

  return errors;
}
