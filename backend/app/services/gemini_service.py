"""Structured extraction of job-application info from candidate emails, via
Google's Gemini API (free tier: no credit card, 1,500 requests/day on
Flash -- plenty for a personal inbox synced on demand).

Deliberately batches every candidate email from one sync into a *single*
Gemini call (one JSON array in, one JSON array out) rather than one call per
email -- fewer requests, faster syncs, and comfortably inside the free
tier's daily cap even for a large batch. Isolated behind this module so it
can be stubbed offline, same pattern as `materials_service.py`'s Cloudinary
boundary.
"""

import json
import re
from typing import List, TypedDict

import requests

from app.core.config import get_settings
from app.services.gmail_service import CandidateEmail
from app.utils.errors import AppError

GENERATE_CONTENT_URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"

VALID_STATUSES = {"saved", "applied", "screening", "interviewing", "offer", "rejected"}

RESPONSE_SCHEMA = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "message_id": {"type": "string"},
            "is_job_related": {"type": "boolean"},
            "company_name": {"type": "string"},
            "job_title": {"type": "string"},
            "detected_status": {"type": "string", "enum": sorted(VALID_STATUSES)},
            "confidence": {"type": "number"},
        },
        "required": ["message_id", "is_job_related", "confidence"],
    },
}

_PROMPT_TEMPLATE = """You extract job-application tracking data from short email previews.

For EACH email below, decide if it's about a job application THE USER submitted (not a job posting, newsletter, or unrelated email). If it is, extract the hiring company's name and the job title, and classify the application's current stage from this exact set: saved, applied, screening, interviewing, offer, rejected. If a field can't be determined, use your best reasonable guess from the subject/sender/snippet, and lower the confidence score accordingly.

Return a JSON array with exactly one object per email, in the same order, each with: message_id, is_job_related, company_name, job_title, detected_status, confidence (0.0-1.0). If is_job_related is false, company_name/job_title/detected_status can be empty strings.

Emails:
{emails_json}
"""


class ExtractionResult(TypedDict):
    message_id: str
    is_job_related: bool
    company_name: str
    job_title: str
    detected_status: str
    confidence: float


def _build_prompt(emails: List[CandidateEmail]) -> str:
    compact = [
        {"message_id": e["message_id"], "subject": e["subject"], "from": e["sender"], "snippet": e["snippet"]}
        for e in emails
    ]
    return _PROMPT_TEMPLATE.format(emails_json=json.dumps(compact, ensure_ascii=False))


def _parse_response_text(text: str) -> list:
    """Gemini, with responseMimeType=application/json, should return clean
    JSON -- but models occasionally wrap output in ```json fences anyway, so
    this strips those defensively before parsing."""
    cleaned = text.strip()
    fence_match = re.match(r"^```(?:json)?\s*(.*)```$", cleaned, re.DOTALL)
    if fence_match:
        cleaned = fence_match.group(1).strip()
    return json.loads(cleaned)


def extract_applications(emails: List[CandidateEmail]) -> List[ExtractionResult]:
    if not emails:
        return []

    settings = get_settings()
    if not settings.gemini_api_key:
        raise AppError("gemini_not_configured", "Smart Import's AI extraction isn't configured on this server yet.", status_code=503)

    body = {
        "contents": [{"parts": [{"text": _build_prompt(emails)}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "responseSchema": RESPONSE_SCHEMA,
            "temperature": 0,
        },
    }
    url = GENERATE_CONTENT_URL.format(model=settings.gemini_model)
    response = requests.post(url, params={"key": settings.gemini_api_key}, json=body, timeout=30)
    if not response.ok:
        raise AppError("gemini_extraction_failed", "The AI couldn't process your emails right now. Please try again shortly.", status_code=502)

    payload = response.json()
    try:
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        raw_results = _parse_response_text(text)
    except (KeyError, IndexError, json.JSONDecodeError) as exc:
        raise AppError("gemini_extraction_failed", "The AI returned an unexpected response. Please try again.", status_code=502) from exc

    results: List[ExtractionResult] = []
    for item in raw_results:
        status = item.get("detected_status") or "applied"
        if status not in VALID_STATUSES:
            status = "applied"
        results.append(
            ExtractionResult(
                message_id=item.get("message_id", ""),
                is_job_related=bool(item.get("is_job_related", False)),
                company_name=(item.get("company_name") or "").strip(),
                job_title=(item.get("job_title") or "").strip(),
                detected_status=status,
                confidence=float(item.get("confidence", 0) or 0),
            )
        )
    return results
