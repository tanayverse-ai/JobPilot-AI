"""Request/response contracts for the Smart Import (Gmail + Gemini)
endpoints."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.application import ApplicationStatus


class GmailAuthUrlResponse(BaseModel):
    auth_url: str


class GmailConnectionStatus(BaseModel):
    connected: bool
    email_address: Optional[str] = None
    last_synced_at: Optional[datetime] = None


class DetectedApplicationPublic(BaseModel):
    id: str
    company_name: str
    job_title: str
    detected_status: ApplicationStatus
    confidence: float
    source_subject: str
    source_received_at: Optional[datetime] = None
    created_at: datetime


class DetectedApplicationListResponse(BaseModel):
    items: List[DetectedApplicationPublic]


class SyncResultResponse(BaseModel):
    scanned: int
    new_detections: int
    already_seen: int
    auto_added: int = 0


class ConfirmDetectionRequest(BaseModel):
    """Lets the user correct the AI's extraction before it becomes a real
    application -- the AI suggests, the user always has the final say."""

    company_name: Optional[str] = Field(default=None, min_length=2, max_length=200)
    job_title: Optional[str] = Field(default=None, min_length=2, max_length=200)
    status: Optional[ApplicationStatus] = None
