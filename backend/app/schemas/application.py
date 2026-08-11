"""Request/response contracts for the applications endpoints."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

from app.models.application import ApplicationStatus, WorkplaceType


class ApplicationCreate(BaseModel):
    company_name: str = Field(min_length=2, max_length=120)
    job_title: str = Field(min_length=2, max_length=160)
    status: ApplicationStatus = ApplicationStatus.saved
    job_url: Optional[str] = Field(default=None, max_length=2048)
    location: Optional[str] = Field(default=None, max_length=200)
    workplace_type: Optional[WorkplaceType] = None
    salary: Optional[str] = Field(default=None, max_length=100)
    job_description: Optional[str] = Field(default=None, max_length=20000)
    notes: Optional[str] = Field(default=None, max_length=5000)
    applied_at: Optional[datetime] = None
    next_action_at: Optional[datetime] = None

    @field_validator("company_name", "job_title")
    @classmethod
    def strip_required(cls, value: str) -> str:
        return value.strip()

    @field_validator("job_url")
    @classmethod
    def validate_job_url(cls, value: Optional[str]) -> Optional[str]:
        if not value:
            return None
        value = value.strip()
        if not (value.startswith("http://") or value.startswith("https://")):
            raise ValueError("job_url must start with http:// or https://")
        return value


class ApplicationUpdate(BaseModel):
    """All fields optional -- PATCH semantics per architecture.md (only
    fields the client actually sent are changed)."""

    company_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    job_title: Optional[str] = Field(default=None, min_length=2, max_length=160)
    status: Optional[ApplicationStatus] = None
    job_url: Optional[str] = Field(default=None, max_length=2048)
    location: Optional[str] = Field(default=None, max_length=200)
    workplace_type: Optional[WorkplaceType] = None
    salary: Optional[str] = Field(default=None, max_length=100)
    job_description: Optional[str] = Field(default=None, max_length=20000)
    notes: Optional[str] = Field(default=None, max_length=5000)
    applied_at: Optional[datetime] = None
    next_action_at: Optional[datetime] = None


class ApplicationPublic(BaseModel):
    id: str
    company_name: str
    job_title: str
    status: ApplicationStatus
    job_url: Optional[str] = None
    location: Optional[str] = None
    workplace_type: Optional[WorkplaceType] = None
    salary: Optional[str] = None
    job_description: Optional[str] = None
    notes: Optional[str] = None
    applied_at: Optional[datetime] = None
    next_action_at: Optional[datetime] = None
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ApplicationListResponse(BaseModel):
    items: List[ApplicationPublic]
    total: int
    limit: int
    offset: int


class ApplicationStageCounts(BaseModel):
    saved: int = 0
    applied: int = 0
    screening: int = 0
    interviewing: int = 0
    offer: int = 0
    rejected: int = 0
    withdrawn: int = 0


class ApplicationsSummary(BaseModel):
    total_active: int
    stage_counts: ApplicationStageCounts
    recent: List[ApplicationPublic]
