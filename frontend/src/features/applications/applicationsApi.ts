import { apiRequest } from "@/lib/apiClient";
import type {
  ApplicationEventListResponse,
  ApplicationListResponse,
  ApplicationPayload,
  ApplicationPublic,
  ApplicationsSummary,
  ApplicationStatus,
  ReminderListResponse,
  SortOption,
} from "@/types/application";

export interface ListApplicationsParams {
  status?: ApplicationStatus | "";
  search?: string;
  includeArchived?: boolean;
  sort?: SortOption;
  limit?: number;
  offset?: number;
}

function buildQuery(params: ListApplicationsParams): string {
  const query = new URLSearchParams();
  if (params.status) query.set("status", params.status);
  if (params.search) query.set("search", params.search);
  if (params.includeArchived) query.set("include_archived", "true");
  if (params.sort) query.set("sort", params.sort);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));
  const qs = query.toString();
  return qs ? `?${qs}` : "";
}

export function listApplications(
  token: string,
  params: ListApplicationsParams = {},
): Promise<ApplicationListResponse> {
  return apiRequest<ApplicationListResponse>(`/api/v1/applications${buildQuery(params)}`, { token });
}

export function getApplicationsSummary(token: string): Promise<ApplicationsSummary> {
  return apiRequest<ApplicationsSummary>("/api/v1/applications/summary", { token });
}

export function getApplication(token: string, id: string): Promise<ApplicationPublic> {
  return apiRequest<ApplicationPublic>(`/api/v1/applications/${id}`, { token });
}

export function createApplication(token: string, payload: ApplicationPayload): Promise<ApplicationPublic> {
  return apiRequest<ApplicationPublic>("/api/v1/applications", { method: "POST", body: payload, token });
}

export function updateApplication(
  token: string,
  id: string,
  payload: Partial<ApplicationPayload>,
): Promise<ApplicationPublic> {
  return apiRequest<ApplicationPublic>(`/api/v1/applications/${id}`, { method: "PATCH", body: payload, token });
}

export function archiveApplication(token: string, id: string): Promise<ApplicationPublic> {
  return apiRequest<ApplicationPublic>(`/api/v1/applications/${id}`, { method: "DELETE", token });
}

export function getApplicationEvents(token: string, id: string): Promise<ApplicationEventListResponse> {
  return apiRequest<ApplicationEventListResponse>(`/api/v1/applications/${id}/events`, { token });
}

export function getReminders(token: string, withinDays = 14): Promise<ReminderListResponse> {
  return apiRequest<ReminderListResponse>(`/api/v1/applications/reminders?within_days=${withinDays}`, { token });
}
