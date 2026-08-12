"""Records and reads the immutable per-application timeline. Written to by
applications_service.py whenever an application is created, has its status
changed, or is archived -- never edited or deleted once written."""

from datetime import datetime, timezone
from typing import List, Optional, Union

from bson import ObjectId
from pymongo.database import Database

from app.models.application_event import ApplicationEventType
from app.schemas.application_event import ApplicationEventListResponse, ApplicationEventPublic


def _collection(db: Database):
    return db["application_events"]


def _to_public(doc: dict) -> ApplicationEventPublic:
    return ApplicationEventPublic(
        id=str(doc["_id"]),
        application_id=str(doc["application_id"]),
        event_type=doc["event_type"],
        occurred_at=doc["occurred_at"],
        metadata=doc.get("metadata"),
    )


def record_event(
    db: Database,
    user_id: str,
    application_id: Union[str, ObjectId],
    event_type: ApplicationEventType,
    metadata: Optional[dict] = None,
) -> None:
    app_oid = application_id if isinstance(application_id, ObjectId) else ObjectId(application_id)
    now = datetime.now(timezone.utc)
    _collection(db).insert_one(
        {
            "user_id": ObjectId(user_id),
            "application_id": app_oid,
            "event_type": event_type.value,
            "occurred_at": now,
            "created_at": now,
            "metadata": metadata,
        }
    )


def list_events(db: Database, user_id: str, application_id: Union[str, ObjectId]) -> ApplicationEventListResponse:
    app_oid = application_id if isinstance(application_id, ObjectId) else ObjectId(application_id)
    cursor = (
        _collection(db)
        .find({"user_id": ObjectId(user_id), "application_id": app_oid})
        .sort("occurred_at", -1)
    )
    items = [_to_public(doc) for doc in cursor]
    return ApplicationEventListResponse(items=items)


def list_events_since(db: Database, user_id: str, since: datetime) -> List[dict]:
    """Raw event documents (not the public schema) across every application
    for this user, for internal use by analytics_service's activity trend --
    unlike list_events, this is not scoped to a single application."""
    cursor = _collection(db).find({"user_id": ObjectId(user_id), "occurred_at": {"$gte": since}})
    return list(cursor)
