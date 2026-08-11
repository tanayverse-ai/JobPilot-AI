"""Persistence-layer representation of an `application_events` document, per
architecture.md's spec: an immutable timeline of meaningful lifecycle actions
for a job application (kept separate from `job_applications` to avoid
unbounded arrays and to preserve auditability)."""

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PyObjectId = Annotated[str, BeforeValidator(str)]


class ApplicationEventType(str, Enum):
    created = "created"
    status_changed = "status_changed"
    updated = "updated"
    archived = "archived"


class ApplicationEventModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId
    application_id: PyObjectId
    event_type: ApplicationEventType
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metadata: Optional[dict] = None
