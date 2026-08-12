import { apiRequest } from "@/lib/apiClient";
import type { ActivityTrendResponse, ResponseRateResponse } from "@/types/analytics";

export function getActivityTrend(token: string, days = 30): Promise<ActivityTrendResponse> {
  return apiRequest<ActivityTrendResponse>(`/api/v1/analytics/activity-trend?days=${days}`, { token });
}

export function getResponseRate(token: string): Promise<ResponseRateResponse> {
  return apiRequest<ResponseRateResponse>("/api/v1/analytics/response-rate", { token });
}
