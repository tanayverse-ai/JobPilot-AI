"""Request/response contracts for the materials (résumé/upload) endpoints."""

from datetime import datetime
from typing import List

from pydantic import BaseModel

from app.models.material import MaterialKind


class MaterialPublic(BaseModel):
    id: str
    kind: MaterialKind
    name: str
    asset_url: str
    mime_type: str
    bytes: int
    created_at: datetime
    updated_at: datetime


class MaterialListResponse(BaseModel):
    items: List[MaterialPublic]
