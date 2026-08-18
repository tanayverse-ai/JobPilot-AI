"""Google OAuth 2.0 (authorization-code + refresh-token) flow for the
Gmail Smart Import feature.

Two things worth calling out:

1. This project's session token lives in the browser's memory only (see
   AuthContext.tsx) -- a full-page redirect to Google and back would wipe
   it. So "Connect Gmail" opens Google's consent screen in a *popup*
   window; the main app tab is never navigated away from.

2. Because of that, the OAuth callback (`GET .../callback`) is hit directly
   by Google, with no Authorization header at all -- there's no JWT to
   identify the user from. Instead, `build_authorization_url` mints a
   random, single-use `state` token and stores it server-side against the
   calling user's id (an `oauth_states` document with a short TTL); the
   callback looks the state back up to know which user just connected.
   This is also exactly what `state` is *for* per the OAuth spec (CSRF
   protection) -- reusing it for user-association avoids ever putting the
   access token in a URL, which we don't do anywhere in this app.

All calls to Google's endpoints are isolated behind this module's
functions (not sprinkled through routes/services) so they can be swapped
for a stub during offline verification.
"""

import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from pymongo.database import Database

from app.core.config import get_settings
from app.utils.errors import AppError

AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly"
STATE_TTL_MINUTES = 10


def _states_collection(db: Database):
    return db["oauth_states"]


def build_authorization_url(db: Database, user_id: str) -> str:
    settings = get_settings()
    if not settings.google_client_id:
        raise AppError(
            "gmail_not_configured",
            "Gmail Smart Import isn't configured on this server yet.",
            status_code=503,
        )

    state = secrets.token_urlsafe(32)
    _states_collection(db).insert_one(
        {
            "state": state,
            "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=STATE_TTL_MINUTES),
        }
    )

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": GMAIL_READONLY_SCOPE,
        "access_type": "offline",
        # Forces Google to re-issue a refresh_token every time, rather than
        # only on the very first consent -- simpler and more predictable
        # for a project at this stage than handling "no refresh_token this
        # time" as a special case.
        "prompt": "consent",
        "state": state,
    }
    query = "&".join(f"{key}={requests.utils.quote(str(value))}" for key, value in params.items())
    return f"{AUTHORIZATION_ENDPOINT}?{query}"


def resolve_state(db: Database, state: str) -> str:
    """Returns the user_id a state token was issued for, consuming it (single
    use) in the process. Raises if the state is unknown, expired, or already
    used -- the CSRF protection this whole scheme exists for."""
    doc = _states_collection(db).find_one_and_delete({"state": state})
    if not doc:
        raise AppError("invalid_oauth_state", "This connection link has expired. Please try connecting again.", status_code=400)
    # PyMongo reads BSON datetimes back as timezone-naive (it always stores
    # them as UTC but drops the tzinfo on the way out), even though we wrote
    # this one as tz-aware -- comparing that directly against
    # datetime.now(timezone.utc) raises TypeError. Treat a naive value as UTC
    # (which is what it actually is) before comparing.
    expires_at = doc["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise AppError("invalid_oauth_state", "This connection link has expired. Please try connecting again.", status_code=400)
    return doc["user_id"]


def exchange_code_for_tokens(code: str) -> dict:
    """Returns Google's raw token response: {access_token, refresh_token,
    expires_in, ...}. Isolated in its own function so offline tests can
    monkeypatch this one call instead of mocking `requests` globally."""
    settings = get_settings()
    response = requests.post(
        TOKEN_ENDPOINT,
        data={
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
            "grant_type": "authorization_code",
        },
        timeout=10,
    )
    if not response.ok:
        raise AppError("gmail_auth_failed", "Couldn't finish connecting to Gmail. Please try again.", status_code=502)
    return response.json()


def refresh_access_token(refresh_token: str) -> str:
    """Exchanges a stored refresh_token for a fresh short-lived access_token.
    Called at the start of every sync -- access tokens aren't stored at all,
    only the long-lived refresh_token, so there's one less secret at rest."""
    settings = get_settings()
    response = requests.post(
        TOKEN_ENDPOINT,
        data={
            "refresh_token": refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
        },
        timeout=10,
    )
    if not response.ok:
        raise AppError(
            "gmail_reconnect_required",
            "Your Gmail connection has expired. Please reconnect it.",
            status_code=409,
        )
    return response.json()["access_token"]


def fetch_user_email_address(access_token: str) -> Optional[str]:
    response = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=10,
    )
    if not response.ok:
        return None
    return response.json().get("email")
