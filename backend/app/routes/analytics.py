"""Feature 6 (Analytics) endpoints: activity trend and response-rate,
computed only from the authenticated user's own data."""

from fastapi import APIRouter, Depends, Query
from pymongo.database import Database

from app.database import get_database
from app.routes.auth import get_current_user
from app.schemas.analytics import ActivityTrendResponse, ResponseRateResponse
from app.schemas.auth import UserPublic
from app.services import analytics_service

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])


@router.get("/activity-trend", response_model=ActivityTrendResponse)
def activity_trend(
    days: int = Query(default=30, ge=1, le=90),
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ActivityTrendResponse:
    return analytics_service.get_activity_trend(db, current_user.id, days=days)


@router.get("/response-rate", response_model=ResponseRateResponse)
def response_rate(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ResponseRateResponse:
    return analytics_service.get_response_rate(db, current_user.id)
