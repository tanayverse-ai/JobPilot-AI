"""Smart Import (Gmail + Gemini) endpoints.

Every endpoint here is auth-required (bearer token) EXCEPT the OAuth
callback, which Google redirects the browser to directly and which
identifies the user via the `state` parameter instead (see
google_oauth_service.py's module docstring for why)."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse
from pymongo.database import Database

from app.core.config import get_settings
from app.database import get_database
from app.routes.auth import get_current_user
from app.schemas.application import ApplicationPublic
from app.schemas.auth import UserPublic
from app.schemas.integration import (
    ConfirmDetectionRequest,
    DetectedApplicationListResponse,
    GmailAuthUrlResponse,
    GmailConnectionStatus,
    SyncResultResponse,
)
from app.services import google_oauth_service, integrations_service

router = APIRouter(prefix="/api/v1/integrations/gmail", tags=["integrations"])


@router.get("/status", response_model=GmailConnectionStatus)
def gmail_status(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> GmailConnectionStatus:
    return integrations_service.get_connection_status(db, current_user.id)


@router.post("/connect-url", response_model=GmailAuthUrlResponse)
def gmail_connect_url(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> GmailAuthUrlResponse:
    return GmailAuthUrlResponse(auth_url=google_oauth_service.build_authorization_url(db, current_user.id))


@router.get("/callback", response_class=HTMLResponse)
def gmail_callback(code: str = Query(...), state: str = Query(...), db: Database = Depends(get_database)):
    # Runs in a popup window Google redirected to -- no Authorization
    # header exists here, `state` is how we know which user this is.
    settings = get_settings()
    try:
        integrations_service.handle_oauth_callback(db, code, state)
        message = "gmail-connected"
    except Exception:
        message = "gmail-connect-failed"

    return HTMLResponse(
        f"""<!DOCTYPE html>
<html><body style="font-family: system-ui; text-align: center; padding-top: 3rem;">
<p>{"Gmail connected — you can close this window." if message == "gmail-connected" else "Something went wrong connecting Gmail."}</p>
<script>
  if (window.opener) {{
    window.opener.postMessage({{ type: "{message}" }}, "{settings.frontend_url}");
  }}
  window.close();
</script>
</body></html>"""
    )


@router.delete("")
def gmail_disconnect(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> dict:
    integrations_service.disconnect_gmail(db, current_user.id)
    return {"disconnected": True}


@router.post("/sync", response_model=SyncResultResponse)
def gmail_sync(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> SyncResultResponse:
    return integrations_service.run_sync(db, current_user.id)


@router.get("/detected", response_model=DetectedApplicationListResponse)
def list_detected_applications(
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> DetectedApplicationListResponse:
    return integrations_service.list_detected(db, current_user.id)


@router.post("/detected/{detected_id}/confirm", response_model=ApplicationPublic)
def confirm_detected_application(
    detected_id: str,
    payload: ConfirmDetectionRequest,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> ApplicationPublic:
    return integrations_service.confirm_detection(db, current_user.id, detected_id, payload)


@router.post("/detected/{detected_id}/reject")
def reject_detected_application(
    detected_id: str,
    current_user: UserPublic = Depends(get_current_user),
    db: Database = Depends(get_database),
) -> dict:
    integrations_service.reject_detection(db, current_user.id, detected_id)
    return {"rejected": True}
