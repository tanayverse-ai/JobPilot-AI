"""Résumé/material upload business logic. Cloudinary is the blob store;
MongoDB stores only provider metadata and business-level relationships (per
architecture.md). Every query is scoped to the owning user.

Cloudinary calls are isolated behind `_configure_cloudinary()` / the
`cloudinary.uploader` module boundary so this module can be exercised
offline against a stub during sandbox verification without a real network
call.
"""

from datetime import datetime, timezone
from typing import Optional

import cloudinary
import cloudinary.uploader
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database

from app.core.config import get_settings
from app.models.material import MaterialKind
from app.schemas.material import MaterialListResponse, MaterialPublic
from app.utils.errors import AppError

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB


def _collection(db: Database):
    return db["materials"]


def _configure_cloudinary() -> None:
    settings = get_settings()
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


def _to_public(doc: dict) -> MaterialPublic:
    return MaterialPublic(
        id=str(doc["_id"]),
        kind=doc["kind"],
        name=doc["name"],
        asset_url=doc["asset_url"],
        mime_type=doc["mime_type"],
        bytes=doc["bytes"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def upload_material(
    db: Database,
    user_id: str,
    kind: MaterialKind,
    name: str,
    file_bytes: bytes,
    mime_type: str,
) -> MaterialPublic:
    if mime_type not in ALLOWED_MIME_TYPES:
        raise AppError(
            "unsupported_file_type",
            "Only PDF, Word documents (.doc/.docx), and images are supported.",
            status_code=422,
        )
    if not file_bytes:
        raise AppError("empty_file", "The uploaded file is empty.", status_code=422)
    if len(file_bytes) > MAX_BYTES:
        raise AppError("file_too_large", "Files must be 10MB or smaller.", status_code=422)

    _configure_cloudinary()
    result = cloudinary.uploader.upload(
        file_bytes,
        resource_type="auto",
        folder=f"jobpilot/{user_id}",
        use_filename=True,
        unique_filename=True,
    )

    now = datetime.now(timezone.utc)
    document = {
        "user_id": ObjectId(user_id),
        "kind": kind.value,
        "name": name.strip() or "Untitled",
        "asset_provider": "cloudinary",
        "asset_public_id": result["public_id"],
        "asset_url": result["secure_url"],
        "mime_type": mime_type,
        "bytes": result.get("bytes", len(file_bytes)),
        "created_at": now,
        "updated_at": now,
    }
    inserted = _collection(db).insert_one(document)
    document["_id"] = inserted.inserted_id
    return _to_public(document)


def list_materials(db: Database, user_id: str) -> MaterialListResponse:
    cursor = _collection(db).find({"user_id": ObjectId(user_id)}).sort("created_at", -1)
    return MaterialListResponse(items=[_to_public(doc) for doc in cursor])


def delete_material(db: Database, user_id: str, material_id: str) -> None:
    try:
        object_id = ObjectId(material_id)
    except InvalidId as exc:
        raise AppError("material_not_found", "Material not found.", status_code=404) from exc

    doc = _collection(db).find_one({"_id": object_id, "user_id": ObjectId(user_id)})
    if not doc:
        raise AppError("material_not_found", "Material not found.", status_code=404)

    _configure_cloudinary()
    try:
        cloudinary.uploader.destroy(doc["asset_public_id"], resource_type="auto")
    except Exception:
        # Best-effort cleanup -- don't block the user's delete on Cloudinary
        # being briefly unreachable; the DB record is the source of truth
        # for what the user sees.
        pass

    _collection(db).delete_one({"_id": object_id, "user_id": ObjectId(user_id)})
