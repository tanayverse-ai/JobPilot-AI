"""Smart Import orchestration: ties together the OAuth connection, Gmail
fetch, and Gemini extraction services, and owns the review-queue workflow.
Most detections need an explicit confirm before they become a real
`job_applications` document -- the one exception is a detection Gemini is
very confident about (>= AUTO_ADD_CONFIDENCE), which is written straight to
the tracker during sync. See AUTO_ADD_CONFIDENCE below for the tradeoff.
"""

from datetime import datetime, timezone
from typing import List

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database

from app.models.application import ApplicationStatus
from app.models.integration import DetectionStatus
from app.schemas.application import ApplicationCreate
from app.schemas.integration import (
    ConfirmDetectionRequest,
    DetectedApplicationListResponse,
    DetectedApplicationPublic,
    GmailConnectionStatus,
    SyncResultResponse,
)
from app.services import applications_service, gemini_service, gmail_service, google_oauth_service
from app.utils.errors import AppError

MIN_CONFIDENCE = 0.5

# Detections at or above this confidence are added straight to the
# tracker during sync -- no click needed. Everything between MIN_CONFIDENCE
# and this stays in the review queue, since a wrong auto-add is worse than
# asking once. Tune this up if auto-added entries turn out to be wrong in
# practice, or down if the review queue feels like it's asking about
# obvious matches too often.
AUTO_ADD_CONFIDENCE = 0.85


def _connections_collection(db: Database):
    return db["gmail_connections"]


def _seen_messages_collection(db: Database):
    return db["gmail_seen_messages"]


def _detected_collection(db: Database):
    return db["detected_applications"]


def get_connection_status(db: Database, user_id: str) -> GmailConnectionStatus:
    doc = _connections_collection(db).find_one({"user_id": ObjectId(user_id)})
    if not doc:
        return GmailConnectionStatus(connected=False)
    return GmailConnectionStatus(
        connected=True, email_address=doc["email_address"], last_synced_at=doc.get("last_synced_at")
    )


def disconnect_gmail(db: Database, user_id: str) -> None:
    _connections_collection(db).delete_one({"user_id": ObjectId(user_id)})


def handle_oauth_callback(db: Database, code: str, state: str) -> None:
    user_id = google_oauth_service.resolve_state(db, state)
    tokens = google_oauth_service.exchange_code_for_tokens(code)
    refresh_token = tokens.get("refresh_token")
    if not refresh_token:
        # Shouldn't happen with access_type=offline&prompt=consent, but if
        # Google omits it (e.g. a re-consent edge case), fail loudly rather
        # than silently storing a connection that can never be refreshed.
        raise AppError(
            "gmail_auth_failed",
            "Gmail didn't grant a persistent connection. Please try connecting again.",
            status_code=502,
        )

    email_address = google_oauth_service.fetch_user_email_address(tokens["access_token"]) or "unknown"

    _connections_collection(db).update_one(
        {"user_id": ObjectId(user_id)},
        {
            "$set": {
                "user_id": ObjectId(user_id),
                "email_address": email_address,
                "refresh_token": refresh_token,
                "connected_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


def _existing_application_keys(db: Database, user_id: str) -> set:
    """(company, title) pairs already tracked (any status, including
    archived) -- used to skip suggesting something the user already has."""
    cursor = db["job_applications"].find({"user_id": ObjectId(user_id)}, {"company_name": 1, "job_title": 1})
    return {(doc["company_name"].strip().lower(), doc["job_title"].strip().lower()) for doc in cursor}


def run_sync(db: Database, user_id: str) -> SyncResultResponse:
    connection = _connections_collection(db).find_one({"user_id": ObjectId(user_id)})
    if not connection:
        raise AppError("gmail_not_connected", "Connect Gmail first before syncing.", status_code=400)

    access_token = google_oauth_service.refresh_access_token(connection["refresh_token"])
    message_ids = gmail_service.list_candidate_message_ids(access_token)

    seen_ids = {
        doc["message_id"]
        for doc in _seen_messages_collection(db).find(
            {"user_id": ObjectId(user_id), "message_id": {"$in": message_ids}}
        )
    }
    new_ids = [mid for mid in message_ids if mid not in seen_ids]

    candidates = [gmail_service.fetch_candidate_email(access_token, mid) for mid in new_ids]
    extractions = gemini_service.extract_applications(candidates) if candidates else []
    by_id = {c["message_id"]: c for c in candidates}

    existing_keys = _existing_application_keys(db, user_id)
    new_detections = 0
    auto_added = 0

    for result in extractions:
        source = by_id.get(result["message_id"])
        if source is None:
            continue

        # Always mark as seen, whether or not it turned into a suggestion --
        # a re-sync should never re-process the same email twice.
        _seen_messages_collection(db).update_one(
            {"user_id": ObjectId(user_id), "message_id": result["message_id"]},
            {"$set": {"user_id": ObjectId(user_id), "message_id": result["message_id"], "processed_at": datetime.now(timezone.utc)}},
            upsert=True,
        )

        if not result["is_job_related"] or result["confidence"] < MIN_CONFIDENCE:
            continue
        if not result["company_name"] or not result["job_title"]:
            continue
        key = (result["company_name"].strip().lower(), result["job_title"].strip().lower())
        if key in existing_keys:
            continue

        if result["confidence"] >= AUTO_ADD_CONFIDENCE:
            # Confident enough to skip the review queue entirely -- add it
            # to the real tracker now, and keep a record here purely as an
            # audit trail (not something awaiting review).
            applications_service.create_application(
                db,
                user_id,
                ApplicationCreate(
                    company_name=result["company_name"],
                    job_title=result["job_title"],
                    status=ApplicationStatus(result["detected_status"]),
                ),
            )
            _detected_collection(db).insert_one(
                {
                    "user_id": ObjectId(user_id),
                    "company_name": result["company_name"],
                    "job_title": result["job_title"],
                    "detected_status": result["detected_status"],
                    "confidence": result["confidence"],
                    "source_message_id": source["message_id"],
                    "source_subject": source["subject"],
                    "source_received_at": None,
                    "review_status": DetectionStatus.auto_added.value,
                    "created_at": datetime.now(timezone.utc),
                }
            )
            existing_keys.add(key)
            auto_added += 1
            continue

        _detected_collection(db).insert_one(
            {
                "user_id": ObjectId(user_id),
                "company_name": result["company_name"],
                "job_title": result["job_title"],
                "detected_status": result["detected_status"],
                "confidence": result["confidence"],
                "source_message_id": source["message_id"],
                "source_subject": source["subject"],
                "source_received_at": None,
                "review_status": DetectionStatus.pending.value,
                "created_at": datetime.now(timezone.utc),
            }
        )
        existing_keys.add(key)  # avoid suggesting the same company/title twice within one sync
        new_detections += 1

    _connections_collection(db).update_one(
        {"user_id": ObjectId(user_id)}, {"$set": {"last_synced_at": datetime.now(timezone.utc)}}
    )

    return SyncResultResponse(
        scanned=len(candidates), new_detections=new_detections, already_seen=len(seen_ids), auto_added=auto_added
    )


def _to_public(doc: dict) -> DetectedApplicationPublic:
    return DetectedApplicationPublic(
        id=str(doc["_id"]),
        company_name=doc["company_name"],
        job_title=doc["job_title"],
        detected_status=doc["detected_status"],
        confidence=doc["confidence"],
        source_subject=doc["source_subject"],
        source_received_at=doc.get("source_received_at"),
        created_at=doc["created_at"],
    )


def list_detected(db: Database, user_id: str) -> DetectedApplicationListResponse:
    cursor = (
        _detected_collection(db)
        .find({"user_id": ObjectId(user_id), "review_status": DetectionStatus.pending.value})
        .sort("created_at", -1)
    )
    return DetectedApplicationListResponse(items=[_to_public(doc) for doc in cursor])


def _get_pending_detection(db: Database, user_id: str, detected_id: str) -> dict:
    try:
        object_id = ObjectId(detected_id)
    except InvalidId as exc:
        raise AppError("detection_not_found", "Detected application not found.", status_code=404) from exc

    doc = _detected_collection(db).find_one(
        {"_id": object_id, "user_id": ObjectId(user_id), "review_status": DetectionStatus.pending.value}
    )
    if not doc:
        raise AppError("detection_not_found", "Detected application not found.", status_code=404)
    return doc


def confirm_detection(db: Database, user_id: str, detected_id: str, overrides: ConfirmDetectionRequest):
    doc = _get_pending_detection(db, user_id, detected_id)

    application = applications_service.create_application(
        db,
        user_id,
        ApplicationCreate(
            company_name=overrides.company_name or doc["company_name"],
            job_title=overrides.job_title or doc["job_title"],
            status=overrides.status or ApplicationStatus(doc["detected_status"]),
        ),
    )

    _detected_collection(db).update_one({"_id": doc["_id"]}, {"$set": {"review_status": DetectionStatus.confirmed.value}})
    return application


def reject_detection(db: Database, user_id: str, detected_id: str) -> None:
    doc = _get_pending_detection(db, user_id, detected_id)
    _detected_collection(db).update_one({"_id": doc["_id"]}, {"$set": {"review_status": DetectionStatus.rejected.value}})
