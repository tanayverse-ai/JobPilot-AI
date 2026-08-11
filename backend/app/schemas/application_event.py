"""Response contracts for the application timeline endpoint."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.models.application_event import ApplicationEventType


class ApplicationEventPublic(BaseModel):
    id: str
    application_id: str
    event_type: ApplicationEventType
    occurred_at: datetime
    metadata: Optional[dict] = None


class ApplicationEventListResponse(BaseModel):
    items: List[ApplicationEventPublic]
