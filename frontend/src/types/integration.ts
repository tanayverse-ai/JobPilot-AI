// Mirrors backend/app/schemas/integration.py so the API contract only has
// one place it can drift: this file.

import type { ApplicationStatus } from "./application";

export interface GmailAuthUrlResponse {
  auth_url: string;
}

export interface GmailConnectionStatus {
  connected: boolean;
  email_address: string | null;
  last_synced_at: string | null;
}

export interface DetectedApplicationPublic {
  id: string;
  company_name: string;
  job_title: string;
  detected_status: ApplicationStatus;
  confidence: number;
  source_subject: string;
  source_received_at: string | null;
  created_at: string;
}

export interface DetectedApplicationListResponse {
  items: DetectedApplicationPublic[];
}

export interface SyncResultResponse {
  scanned: number;
  new_detections: number;
  already_seen: number;
  auto_added: number;
}

export interface ConfirmDetectionPayload {
  company_name?: string;
  job_title?: string;
  status?: ApplicationStatus;
}
