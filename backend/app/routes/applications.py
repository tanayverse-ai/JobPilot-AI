"""Feature 2 (Application management) endpoints, per architecture.md's
roadmap: create, list, inspect, edit, and archive job applications."""

from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, status
from pymongo.database import Database

from app.database import get_database
from app.models.application import ApplicationStatus
from app.routes.auth import get_current_user
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationPublic,
    ApplicationsSummary,
    ApplicationUpdate,
    ReminderListResponse,
)
from app.schemas.application_event import ApplicationEventListResponse
from app.schemas.auth import UserPublic
from app.services import application_events_service, applications_service

router = APIRouter(prefix="/api/v1/applications", tags=["applications"])

SortOption = Literal["updated_desc", "created_desc", "company_asc", "title_asc", "next_action_asc"]


@router.post("", response_model=ApplicationPublic, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationPublic:
    return applications_service.create_application(db, current_user.id, payload)


@router.get("", response_model=ApplicationListResponse)
def list_applications(
    status_filter: Optional[ApplicationStatus] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None, max_length=200),
    include_archived: bool = Query(default=False),
    sort: SortOption = Query(default="updated_desc"),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationListResponse:
    return applications_service.list_applications(
        db,
        current_user.id,
        status=status_filter,
        search=search,
        include_archived=include_archived,
        sort=sort,
        limit=limit,
        offset=offset,
    )


# Registered before /{application_id} so "summary"/"reminders" are never
# captured as an id.
@router.get("/summary", response_model=ApplicationsSummary)
def applications_summary(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationsSummary:
    return applications_service.get_summary(db, current_user.id)


@router.get("/reminders", response_model=ReminderListResponse)
def applications_reminders(
    within_days: int = Query(default=14, ge=1, le=90),
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ReminderListResponse:
    return applications_service.get_reminders(db, current_user.id, within_days=within_days)


@router.get("/{application_id}", response_model=ApplicationPublic)
def get_application(
    application_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationPublic:
    return applications_service.get_application(db, current_user.id, application_id)


@router.patch("/{application_id}", response_model=ApplicationPublic)
def update_application(
    application_id: str,
    payload: ApplicationUpdate,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationPublic:
    return applications_service.update_application(db, current_user.id, application_id, payload)


@router.delete("/{application_id}", response_model=ApplicationPublic)
def archive_application(
    application_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationPublic:
    return applications_service.archive_application(db, current_user.id, application_id)


@router.get("/{application_id}/events", response_model=ApplicationEventListResponse)
def list_application_events(
    application_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationEventListResponse:
    # Confirms the application exists and belongs to the caller before
    # exposing any timeline entries for it.
    applications_service.get_application(db, current_user.id, application_id)
    return application_events_service.list_events(db, current_user.id, application_id)
