"""Read-only Gmail access for Smart Import, via plain REST calls (no
`google-api-python-client` dependency -- keeps the dependency footprint the
same shape as the rest of this project's third-party integrations).

Only ever requests `gmail.readonly` scope and only ever reads: no send,
delete, or modify calls exist anywhere in this module.
"""

from typing import List, TypedDict

import requests

from app.utils.errors import AppError

MESSAGES_LIST_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages"
MESSAGE_GET_URL = "https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}"

# Deliberately bounded: a search-narrowed, keyword-filtered, recent window --
# never "read the whole inbox". Keeps this comfortably inside Gmail's own
# quota and the free Gemini tier's daily request cap.
SEARCH_QUERY = (
    'newer_than:60d ('
    'subject:(application OR applying OR applied OR interview OR interviewing '
    'OR offer OR "not moving forward" OR rejected OR onboarding) '
    'OR "thank you for applying" OR "your application")'
)
MAX_CANDIDATES = 25


class CandidateEmail(TypedDict):
    message_id: str
    subject: str
    sender: str
    snippet: str
    received_at: str  # ISO 8601, or "" if unavailable


def _headers(access_token: str) -> dict:
    return {"Authorization": f"Bearer {access_token}"}


def _get_header(headers: list, name: str) -> str:
    for header in headers:
        if header.get("name", "").lower() == name.lower():
            return header.get("value", "")
    return ""


def list_candidate_message_ids(access_token: str, max_results: int = MAX_CANDIDATES) -> List[str]:
    response = requests.get(
        MESSAGES_LIST_URL,
        headers=_headers(access_token),
        params={"q": SEARCH_QUERY, "maxResults": max_results},
        timeout=10,
    )
    if response.status_code == 401:
        raise AppError("gmail_reconnect_required", "Your Gmail connection has expired. Please reconnect it.", status_code=409)
    if not response.ok:
        raise AppError("gmail_sync_failed", "Couldn't read your Gmail inbox right now. Please try again shortly.", status_code=502)

    return [msg["id"] for msg in response.json().get("messages", [])]


def fetch_candidate_email(access_token: str, message_id: str) -> CandidateEmail:
    """Metadata-only fetch (subject/from headers + Gmail's own short
    `snippet` preview) -- never downloads or parses the full MIME body."""
    response = requests.get(
        MESSAGE_GET_URL.format(id=message_id),
        headers=_headers(access_token),
        params={"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]},
        timeout=10,
    )
    if not response.ok:
        raise AppError("gmail_sync_failed", "Couldn't read your Gmail inbox right now. Please try again shortly.", status_code=502)

    payload = response.json()
    headers = payload.get("payload", {}).get("headers", [])
    return CandidateEmail(
        message_id=payload["id"],
        subject=_get_header(headers, "Subject"),
        sender=_get_header(headers, "From"),
        snippet=payload.get("snippet", ""),
        received_at=_get_header(headers, "Date"),
    )
