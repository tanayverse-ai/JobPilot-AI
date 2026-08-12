"""Application (job application) business logic. Every query is scoped to
the owning user -- per architecture.md: "Authenticated resource queries
always filter by the JWT subject (user_id); a path identifier alone never
grants access."

Pagination here is simple offset/limit rather than the opaque-cursor scheme
architecture.md describes for the eventual production API -- a deliberate
simplification for this stage, called out so it isn't mistaken for the
final design.
"""

import re
from datetime import datetime, timedelta, timezone
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ReturnDocument
from pymongo.database import Database

from app.models.application import ApplicationModel, ApplicationStatus
from app.models.application_event import ApplicationEventType
from app.schemas.application import (
    ApplicationCreate,
    ApplicationListResponse,
    ApplicationPublic,
    ApplicationStageCounts,
    ApplicationsSummary,
    ApplicationUpdate,
    ReminderListResponse,
)
from app.services import application_events_service
from app.utils.errors import AppError

MAX_LIMIT = 100
DEFAULT_LIMIT = 20

# Allow-listed sorts only (per architecture.md: "allow-listed filters and
# sorts") -- never sort by a raw client-supplied field name.
SORT_OPTIONS = {
    "updated_desc": ("updated_at", -1),
    "created_desc": ("created_at", -1),
    "company_asc": ("company_name", 1),
    "title_asc": ("job_title", 1),
    "next_action_asc": ("next_action_at", 1),
}
DEFAULT_SORT = "updated_desc"

REMINDER_HORIZON_DAYS = 14
REMINDER_MAX_ITEMS = 20


def _collection(db: Database):
    return db["job_applications"]


def _to_object_id(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except InvalidId as exc:
        raise AppError("application_not_found", "Application not found.", status_code=404) from exc


def _to_public(doc: dict) -> ApplicationPublic:
    return ApplicationPublic(
        id=str(doc["_id"]),
        company_name=doc["company_name"],
        job_title=doc["job_title"],
        status=doc["status"],
        job_url=doc.get("job_url"),
        location=doc.get("location"),
        workplace_type=doc.get("workplace_type"),
        salary=doc.get("salary"),
        job_description=doc.get("job_description"),
        notes=doc.get("notes"),
        applied_at=doc.get("applied_at"),
        next_action_at=doc.get("next_action_at"),
        archived_at=doc.get("archived_at"),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def create_application(db: Database, user_id: str, payload: ApplicationCreate) -> ApplicationPublic:
    now = datetime.now(timezone.utc)
    application = ApplicationModel(
        user_id=user_id,
        company_name=payload.company_name,
        job_title=payload.job_title,
        status=payload.status,
        job_url=payload.job_url,
        location=payload.location,
        workplace_type=payload.workplace_type,
        salary=payload.salary,
        job_description=payload.job_description,
        notes=payload.notes,
        applied_at=payload.applied_at,
        next_action_at=payload.next_action_at,
        created_at=now,
        updated_at=now,
    )
    document = application.model_dump(by_alias=True, exclude={"id"})
    # Store enums by their raw value and user_id as a real ObjectId --
    # explicit, rather than relying on str+Enum/PyObjectId coercion quirks
    # surviving whatever the Mongo driver does under the hood.
    document["user_id"] = ObjectId(user_id)
    document["status"] = application.status.value
    if application.workplace_type is not None:
        document["workplace_type"] = application.workplace_type.value

    result = _collection(db).insert_one(document)
    document["_id"] = result.inserted_id

    application_events_service.record_event(
        db, user_id, result.inserted_id, ApplicationEventType.created,
        metadata={"status": document["status"]},
    )

    return _to_public(document)


def list_applications(
    db: Database,
    user_id: str,
    *,
    status: Optional[ApplicationStatus] = None,
    search: Optional[str] = None,
    include_archived: bool = False,
    sort: str = DEFAULT_SORT,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> ApplicationListResponse:
    limit = max(1, min(limit, MAX_LIMIT))
    offset = max(0, offset)
    sort_field, sort_direction = SORT_OPTIONS.get(sort, SORT_OPTIONS[DEFAULT_SORT])

    query: dict = {"user_id": ObjectId(user_id)}
    if not include_archived:
        query["archived_at"] = None
    if status is not None:
        query["status"] = status.value
    if search:
        pattern = re.escape(search.strip())
        query["$or"] = [
            {"company_name": {"$regex": pattern, "$options": "i"}},
            {"job_title": {"$regex": pattern, "$options": "i"}},
        ]

    collection = _collection(db)
    total = collection.count_documents(query)
    cursor = collection.find(query).sort(sort_field, sort_direction).skip(offset).limit(limit)
    items = [_to_public(doc) for doc in cursor]

    return ApplicationListResponse(items=items, total=total, limit=limit, offset=offset)


def get_application(db: Database, user_id: str, application_id: str) -> ApplicationPublic:
    object_id = _to_object_id(application_id)
    doc = _collection(db).find_one({"_id": object_id, "user_id": ObjectId(user_id)})
    if not doc:
        raise AppError("application_not_found", "Application not found.", status_code=404)
    return _to_public(doc)


def update_application(
    db: Database, user_id: str, application_id: str, payload: ApplicationUpdate
) -> ApplicationPublic:
    object_id = _to_object_id(application_id)
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("status") is not None:
        updates["status"] = updates["status"].value
    if updates.get("workplace_type") is not None:
        updates["workplace_type"] = updates["workplace_type"].value
    if not updates:
        return get_application(db, user_id, application_id)

    existing = _collection(db).find_one({"_id": object_id, "user_id": ObjectId(user_id)})
    if not existing:
        raise AppError("application_not_found", "Application not found.", status_code=404)
    previous_status = existing.get("status")

    updates["updated_at"] = datetime.now(timezone.utc)
    doc = _collection(db).find_one_and_update(
        {"_id": object_id, "user_id": ObjectId(user_id)},
        {"$set": updates},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise AppError("application_not_found", "Application not found.", status_code=404)

    new_status = updates.get("status")
    if new_status is not None and new_status != previous_status:
        application_events_service.record_event(
            db, user_id, object_id, ApplicationEventType.status_changed,
            metadata={"from": previous_status, "to": new_status},
        )
    other_fields_changed = bool(set(updates.keys()) - {"status", "updated_at"})
    if other_fields_changed:
        application_events_service.record_event(db, user_id, object_id, ApplicationEventType.updated)

    return _to_public(doc)


def archive_application(db: Database, user_id: str, application_id: str) -> ApplicationPublic:
    object_id = _to_object_id(application_id)
    now = datetime.now(timezone.utc)
    doc = _collection(db).find_one_and_update(
        {"_id": object_id, "user_id": ObjectId(user_id)},
        {"$set": {"archived_at": now, "updated_at": now}},
        return_document=ReturnDocument.AFTER,
    )
    if not doc:
        raise AppError("application_not_found", "Application not found.", status_code=404)

    application_events_service.record_event(db, user_id, object_id, ApplicationEventType.archived)

    return _to_public(doc)


def get_reminders(db: Database, user_id: str, within_days: int = REMINDER_HORIZON_DAYS) -> ReminderListResponse:
    """Active applications with a `next_action_at` that's already overdue or
    falls within the next `within_days` days, earliest first. There's no
    email/push infrastructure here -- this is a simple in-app "what needs my
    attention" query, not a notification system."""
    horizon = datetime.now(timezone.utc) + timedelta(days=within_days)
    query = {
        "user_id": ObjectId(user_id),
        "archived_at": None,
        "next_action_at": {"$exists": True, "$ne": None, "$lte": horizon},
    }
    cursor = _collection(db).find(query).sort("next_action_at", 1).limit(REMINDER_MAX_ITEMS)
    items = [_to_public(doc) for doc in cursor]
    return ReminderListResponse(items=items)


def get_summary(db: Database, user_id: str) -> ApplicationsSummary:
    collection = _collection(db)
    base_query = {"user_id": ObjectId(user_id), "archived_at": None}

    counts = {s.value: 0 for s in ApplicationStatus}
    for doc in collection.aggregate([{"$match": base_query}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        if doc["_id"] in counts:
            counts[doc["_id"]] = doc["count"]

    recent_cursor = collection.find(base_query).sort("updated_at", -1).limit(5)
    recent = [_to_public(doc) for doc in recent_cursor]

    return ApplicationsSummary(
        total_active=sum(counts.values()),
        stage_counts=ApplicationStageCounts(**counts),
        recent=recent,
    )
