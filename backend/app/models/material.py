"""Persistence-layer representation of a `materials` document, per
architecture.md's spec: résumés, cover letters, and other application
materials, file-backed via Cloudinary (MongoDB stores only provider
metadata and business-level relationships, never the file bytes)."""

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated, Optional

from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PyObjectId = Annotated[str, BeforeValidator(str)]


class MaterialKind(str, Enum):
    resume = "resume"
    cover_letter = "cover_letter"
    portfolio = "portfolio"
    other = "other"


class MaterialModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    id: Optional[PyObjectId] = Field(default=None, alias="_id")
    user_id: PyObjectId
    kind: MaterialKind
    name: str
    asset_provider: str = "cloudinary"
    asset_public_id: str
    asset_url: str
    mime_type: str
    bytes: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
