"""Persistence-layer representation of a `job_applications` document, per
architecture.md's collection spec (status is a controlled enum, user_id is a
foreign key so applications can be queried/paginated/indexed independently
of `users`)."""

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PyObjectId = Annotated[str, BeforeValidator(str)]


class ApplicationStatus(str, Enum):
    saved = "saved"
    applied = "applied"
    screening = "screening"
    interviewing = "interviewing"
    offer = "offer"
    rejected = "rejected"
    withdrawn = "withdrawn"


class WorkplaceType(str, Enum):
    onsite = "onsite"
    remote = "remote"
    hybrid = "hybrid"


class ApplicationModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId
    company_name: str
    job_title: str
    status: ApplicationStatus = ApplicationStatus.saved
    job_url: Optional[str] = None
    location: Optional[str] = None
    workplace_type: Optional[WorkplaceType] = None
    salary: Optional[str] = None
    job_description: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None
    next_action_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
