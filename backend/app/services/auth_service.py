"""Auth business logic: registration, login, and token->user resolution.
Kept out of route handlers so routes stay thin request/response glue."""

from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.database import Database
from pymongo.errors import DuplicateKeyError

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import UserModel
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from app.utils.errors import AppError


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _to_public(user_doc: dict) -> UserPublic:
    return UserPublic(
        id=str(user_doc["_id"]),
        email=user_doc["email"],
        display_name=user_doc["display_name"],
        avatar_url=user_doc.get("avatar_url"),
        created_at=user_doc["created_at"],
    )


def register_user(db: Database, payload: RegisterRequest) -> TokenResponse:
    email = _normalize_email(payload.email)
    users = db["users"]

    if users.find_one({"email": email}):
        # 409 to avoid a distinguishable "does this email exist" oracle on
        # login, but still tell the person who legitimately owns it why.
        raise AppError(
            "email_already_registered",
            "This email is already registered. Log in or reset your password.",
            status_code=409,
        )

    now = datetime.now(timezone.utc)
    user = UserModel(
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name,
        created_at=now,
        updated_at=now,
    )
    document = user.model_dump(by_alias=True, exclude={"id"})

    try:
        result = users.insert_one(document)
    except DuplicateKeyError as exc:
        raise AppError(
            "email_already_registered",
            "This email is already registered. Log in or reset your password.",
            status_code=409,
        ) from exc

    document["_id"] = result.inserted_id
    token = create_access_token(subject=str(result.inserted_id))
    return TokenResponse(access_token=token, user=_to_public(document))


def authenticate_user(db: Database, payload: LoginRequest) -> TokenResponse:
    email = _normalize_email(payload.email)
    user_doc = db["users"].find_one({"email": email})

    # One generic message for both "no such user" and "wrong password" to
    # prevent account enumeration, per architecture.md.
    if not user_doc or not verify_password(payload.password, user_doc["password_hash"]):
        raise AppError("invalid_credentials", "Email or password is incorrect.", status_code=401)

    db["users"].update_one({"_id": user_doc["_id"]}, {"$set": {"last_login_at": datetime.now(timezone.utc)}})

    token = create_access_token(subject=str(user_doc["_id"]))
    return TokenResponse(access_token=token, user=_to_public(user_doc))


def get_user_by_id(db: Database, user_id: str) -> UserPublic:
    try:
        object_id = ObjectId(user_id)
    except InvalidId as exc:
        raise AppError("invalid_token", "Session is invalid. Please log in again.", status_code=401) from exc

    user_doc = db["users"].find_one({"_id": object_id})
    if not user_doc:
        raise AppError("invalid_token", "Session is invalid. Please log in again.", status_code=401)

    return _to_public(user_doc)
