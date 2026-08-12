"""Feature 1 (Authentication foundation) endpoints, per architecture.md:
POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me."""

from typing import Optional

import jwt
from fastapi import APIRouter, Depends, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pymongo.database import Database

from app.core.security import decode_access_token
from app.database import get_database
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from app.services import auth_service
from app.utils.errors import AppError

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])
_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    db: Database = Depends(get_database),
) -> UserPublic:
    if credentials is None:
        raise AppError("missing_token", "Authentication is required.", status_code=401)

    try:
        payload = decode_access_token(credentials.credentials)
    except jwt.ExpiredSignatureError as exc:
        raise AppError("token_expired", "Your session has expired. Please log in again.", status_code=401) from exc
    except jwt.InvalidTokenError as exc:
        raise AppError("invalid_token", "Session is invalid. Please log in again.", status_code=401) from exc

    user_id = payload.get("sub")
    if not user_id:
        raise AppError("invalid_token", "Session is invalid. Please log in again.", status_code=401)

    return auth_service.get_user_by_id(db, user_id)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Database = Depends(get_database)) -> TokenResponse:
    return auth_service.register_user(db, payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Database = Depends(get_database)) -> TokenResponse:
    return auth_service.authenticate_user(db, payload)


@router.get("/me", response_model=UserPublic)
def read_current_user(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    return current_user
