"""Persistence-layer representations for the Smart Import (Gmail + Gemini)
feature: a per-user Gmail OAuth connection, short-lived OAuth CSRF state
tokens, a record of already-processed Gmail messages (so re-syncing doesn't
reprocess the same email twice), and AI-detected applications awaiting the
user's confirmation before they become real `job_applications` documents.

Nothing here is auto-committed to the user's tracker without an explicit
confirm -- the AI only ever *suggests*, per the product decision to keep a
human in the loop rather than silently writing data the user didn't
approve.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PyObjectId = Annotated[str, BeforeValidator(str)]


class DetectionStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    rejected = "rejected"


class GmailConnectionModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId
    email_address: str
    refresh_token: str
    connected_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_synced_at: Optional[datetime] = None


class DetectedApplicationModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId
    company_name: str
    job_title: str
    detected_status: str
    confidence: float
    source_message_id: str
    source_subject: str
    source_received_at: Optional[datetime] = None
    review_status: DetectionStatus = DetectionStatus.pending
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
