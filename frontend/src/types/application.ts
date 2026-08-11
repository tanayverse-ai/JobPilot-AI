// Mirrors backend/app/schemas/application.py so the API contract only has
// one place it can drift: this file.

export type ApplicationStatus =
  | "saved"
  | "applied"
  | "screening"
  | "interviewing"
  | "offer"
  | "rejected"
  | "withdrawn";

export type WorkplaceType = "onsite" | "remote" | "hybrid";

export const STATUS_ORDER: ApplicationStatus[] = [
  "saved",
  "applied",
  "screening",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  applied: "Applied",
  screening: "Screening",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const WORKPLACE_LABELS: Record<WorkplaceType, string> = {
  onsite: "On-site",
  remote: "Remote",
  hybrid: "Hybrid",
};

export type SortOption = "updated_desc" | "created_desc" | "company_asc" | "title_asc" | "next_action_asc";

export const SORT_OPTIONS_ORDER: SortOption[] = [
  "updated_desc",
  "created_desc",
  "company_asc",
  "title_asc",
  "next_action_asc",
];

export const SORT_LABELS: Record<SortOption, string> = {
  updated_desc: "Recently updated",
  created_desc: "Recently added",
  company_asc: "Company (A–Z)",
  title_asc: "Job title (A–Z)",
  next_action_asc: "Next action date",
};

export interface ApplicationPublic {
  id: string;
  company_name: string;
  job_title: string;
  status: ApplicationStatus;
  job_url: string | null;
  location: string | null;
  workplace_type: WorkplaceType | null;
  salary: string | null;
  job_description: string | null;
  notes: string | null;
  applied_at: string | null;
  next_action_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationListResponse {
  items: ApplicationPublic[];
  total: number;
  limit: number;
  offset: number;
}

export interface ApplicationStageCounts {
  saved: number;
  applied: number;
  screening: number;
  interviewing: number;
  offer: number;
  rejected: number;
  withdrawn: number;
}

export interface ApplicationsSummary {
  total_active: number;
  stage_counts: ApplicationStageCounts;
  recent: ApplicationPublic[];
}

export type ApplicationEventType = "created" | "status_changed" | "updated" | "archived";

export interface ApplicationEvent {
  id: string;
  application_id: string;
  event_type: ApplicationEventType;
  occurred_at: string;
  metadata: Record<string, unknown> | null;
}

export interface ApplicationEventListResponse {
  items: ApplicationEvent[];
}

export interface ApplicationFormValues {
  company_name: string;
  job_title: string;
  status: ApplicationStatus;
  job_url: string;
  location: string;
  workplace_type: WorkplaceType | "";
  salary: string;
  job_description: string;
  notes: string;
  applied_at: string;
  next_action_at: string;
}

export const EMPTY_APPLICATION_FORM_VALUES: ApplicationFormValues = {
  company_name: "",
  job_title: "",
  status: "saved",
  job_url: "",
  location: "",
  workplace_type: "",
  salary: "",
  job_description: "",
  notes: "",
  applied_at: "",
  next_action_at: "",
};

export interface ApplicationPayload {
  company_name: string;
  job_title: string;
  status?: ApplicationStatus;
  job_url?: string | null;
  location?: string | null;
  workplace_type?: WorkplaceType | null;
  salary?: string | null;
  job_description?: string | null;
  notes?: string | null;
  applied_at?: string | null;
  next_action_at?: string | null;
}
