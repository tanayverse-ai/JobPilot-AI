"""Health check used by deployment-guide.md's Render health check path."""

from fastapi import APIRouter, Depends
from pymongo.database import Database
from pymongo.errors import PyMongoError

from app.database import get_database

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check(db: Database = Depends(get_database)) -> dict:
    try:
        db.client.admin.command("ping")
        return {"status": "healthy", "database": "connected"}
    except PyMongoError as exc:
        return {"status": "unhealthy", "database": "disconnected", "error": str(exc)}
