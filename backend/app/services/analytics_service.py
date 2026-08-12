"""Feature 6 (Analytics) business logic -- activity trend and response-rate
metrics, "derived only from that user's applications" per architecture.md.

The day-by-day trend is grouped in Python rather than via a Mongo
`$dateToString` aggregation stage -- this keeps the logic portable and easy
to unit-test, and job-search event volumes are small enough that this is not
a performance concern.
"""

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from bson import ObjectId
from pymongo.database import Database

from app.models.application import ApplicationStatus
from app.schemas.analytics import ActivityTrendPoint, ActivityTrendResponse, ResponseRateResponse
from app.services import application_events_service

MAX_TREND_DAYS = 90
DEFAULT_TREND_DAYS = 30


def _applications_collection(db: Database):
    return db["job_applications"]


def get_activity_trend(db: Database, user_id: str, days: int = DEFAULT_TREND_DAYS) -> ActivityTrendResponse:
    days = max(1, min(days, MAX_TREND_DAYS))
    now = datetime.now(timezone.utc)
    start_day = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    events = application_events_service.list_events_since(db, user_id, start_day)
    counts: dict = defaultdict(int)
    for event in events:
        day_key = event["occurred_at"].strftime("%Y-%m-%d")
        counts[day_key] += 1

    points = []
    for i in range(days):
        day = start_day + timedelta(days=i)
        key = day.strftime("%Y-%m-%d")
        points.append(ActivityTrendPoint(date=key, count=counts.get(key, 0)))

    return ActivityTrendResponse(points=points)


def get_response_rate(db: Database, user_id: str) -> ResponseRateResponse:
    """"Responded" = any application that moved past "applied" -- screening,
    interviewing, offer, or rejected. "Submitted" is that plus still-pending
    "applied" ones. `saved` (never submitted) and `withdrawn` (user pulled
    out, not a company response) are deliberately excluded from both."""
    collection = _applications_collection(db)
    base_query = {"user_id": ObjectId(user_id), "archived_at": None}

    counts = {status.value: 0 for status in ApplicationStatus}
    for doc in collection.aggregate([{"$match": base_query}, {"$group": {"_id": "$status", "count": {"$sum": 1}}}]):
        if doc["_id"] in counts:
            counts[doc["_id"]] = doc["count"]

    responded = counts["screening"] + counts["interviewing"] + counts["offer"] + counts["rejected"]
    submitted = responded + counts["applied"]
    rate = round((responded / submitted) * 100, 1) if submitted > 0 else 0.0

    return ResponseRateResponse(submitted=submitted, responded=responded, rate=rate)
