import { apiRequest } from "@/lib/apiClient";
import type { ApplicationPublic } from "@/types/application";
import type {
  ConfirmDetectionPayload,
  DetectedApplicationListResponse,
  GmailAuthUrlResponse,
  GmailConnectionStatus,
  SyncResultResponse,
} from "@/types/integration";

const BASE = "/api/v1/integrations/gmail";

export function getGmailStatus(token: string): Promise<GmailConnectionStatus> {
  return apiRequest<GmailConnectionStatus>(`${BASE}/status`, { token });
}

export function getGmailConnectUrl(token: string): Promise<GmailAuthUrlResponse> {
  return apiRequest<GmailAuthUrlResponse>(`${BASE}/connect-url`, { method: "POST", token });
}

export function disconnectGmail(token: string): Promise<void> {
  return apiRequest<void>(BASE, { method: "DELETE", token });
}

export function syncGmail(token: string): Promise<SyncResultResponse> {
  return apiRequest<SyncResultResponse>(`${BASE}/sync`, { method: "POST", token });
}

export function listDetectedApplications(token: string): Promise<DetectedApplicationListResponse> {
  return apiRequest<DetectedApplicationListResponse>(`${BASE}/detected`, { token });
}

export function confirmDetection(
  token: string,
  id: string,
  payload: ConfirmDetectionPayload,
): Promise<ApplicationPublic> {
  return apiRequest<ApplicationPublic>(`${BASE}/detected/${id}/confirm`, {
    method: "POST",
    body: payload,
    token,
  });
}

export function rejectDetection(token: string, id: string): Promise<void> {
  return apiRequest<void>(`${BASE}/detected/${id}/reject`, { method: "POST", token });
}
