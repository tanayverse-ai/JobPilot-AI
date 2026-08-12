"""Feature 4 (Materials) endpoints, per architecture.md's roadmap: upload,
list, and delete résumé / cover-letter / portfolio files, Cloudinary-backed."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile, status
from pymongo.database import Database

from app.database import get_database
from app.models.material import MaterialKind
from app.routes.auth import get_current_user
from app.schemas.auth import UserPublic
from app.schemas.material import MaterialListResponse, MaterialPublic
from app.services import materials_service

router = APIRouter(prefix="/api/v1/materials", tags=["materials"])


@router.post("", response_model=MaterialPublic, status_code=status.HTTP_201_CREATED)
async def upload_material(
    file: UploadFile = File(...),
    kind: MaterialKind = Form(...),
    name: Optional[str] = Form(default=None),
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> MaterialPublic:
    file_bytes = await file.read()
    display_name = (name or file.filename or "Untitled").strip()
    return materials_service.upload_material(
        db,
        current_user.id,
        kind,
        display_name,
        file_bytes,
        file.content_type or "application/octet-stream",
    )


@router.get("", response_model=MaterialListResponse)
def list_materials(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> MaterialListResponse:
    return materials_service.list_materials(db, current_user.id)


@router.delete("/{material_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_material(
    material_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> None:
    materials_service.delete_material(db, current_user.id, material_id)
