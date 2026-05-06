"""
ai_service.py — metadata-leak analyst backed by the Google Gemini API.

Receives ONLY anonymized session statistics (hour/day, chosen TTL, ciphertext
size, hourly platform traffic) — no message content, no IPs, no identifiers.
Returns a list of warnings + a risk_level the recipient sees alongside their
decrypted message.

Talks to the Gemini REST endpoint directly via httpx — same approach as
intent_service.py, no SDK required.
"""
import json
import logging
import time

import httpx

from backend.config import settings
from backend.models.ai import AIAnalysisResponse, SessionMetadata

logger = logging.getLogger(__name__)


GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent"
)

SYSTEM_PROMPT = """You are a metadata-pattern analyst for an encrypted dead-drop messaging system.
You receive only anonymized session statistics — no message content, no IP addresses, no user
identifiers — and identify patterns that might inadvertently leak operational information through
timing, volume, or behavior alone.

Output a JSON object with this exact shape:
{"warnings": ["..."], "risk_level": "low"|"medium"|"high"}

Rules:
- warnings is a list of plain English strings, 1–2 sentences each
- Empty list if no anomalies worth flagging
- Be conservative: flag only statistically meaningful deviations, not normal behavior
- risk_level reflects the most severe warning: low = no notable risk, medium = worth noting,
  high = clear metadata leakage risk
- Never speculate beyond the data provided
- Never ask for more information"""


def _build_user_prompt(m: SessionMetadata) -> str:
    return (
        "Analyze this anonymized session metadata for metadata-leakage risks:\n\n"
        f"- Time of creation: {m.hour_of_day:02d}:00 UTC, "
        f"day {m.day_of_week} of week (0=Mon, 6=Sun)\n"
        f"- Chosen TTL: {m.ttl_chosen_seconds}s ({m.ttl_chosen_seconds / 60:.0f} minutes)\n"
        f"- Ciphertext size: {m.ciphertext_size_bytes} bytes\n"
        f"- Platform activity this hour: {m.drops_created_in_last_hour} drops created, "
        f"{m.reads_in_last_hour} reads\n\n"
        "Identify any metadata-leakage risks based solely on these patterns."
    )


def _empty_response() -> AIAnalysisResponse:
    return AIAnalysisResponse(warnings=[], risk_level="low", analyzed_at=int(time.time()))


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text[3:]
        if text.lower().startswith("json"):
            text = text[4:]
        if text.endswith("```"):
            text = text[:-3]
    return text.strip()


class AIService:
    """Calls the Gemini API REST endpoint for metadata-leak analysis."""

    async def analyze(self, metadata: SessionMetadata) -> AIAnalysisResponse:
        if not settings.gemini_api_key:
            logger.info("Metadata analysis unavailable: GEMINI_API_KEY not set")
            return _empty_response()

        url = GEMINI_ENDPOINT.format(model=settings.gemini_model)
        prompt = _build_user_prompt(metadata)

        body = {
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}],
            },
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]},
            ],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 512,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    url,
                    headers={
                        "Content-Type": "application/json",
                        "x-goog-api-key": settings.gemini_api_key,
                    },
                    json=body,
                )
                resp.raise_for_status()
                data = resp.json()

            candidates = data.get("candidates") or []
            if not candidates:
                logger.warning("Gemini returned no candidates: %s", data)
                return _empty_response()

            parts = (candidates[0].get("content") or {}).get("parts") or []
            raw_text = next((p.get("text", "") for p in parts if p.get("text")), "")
            if not raw_text:
                return _empty_response()

            parsed = json.loads(_strip_code_fence(raw_text))
            warnings = parsed.get("warnings", [])
            risk_level = parsed.get("risk_level", "low")
            if risk_level not in ("low", "medium", "high"):
                risk_level = "low"

            return AIAnalysisResponse(
                warnings=warnings if isinstance(warnings, list) else [],
                risk_level=risk_level,
                analyzed_at=int(time.time()),
            )

        except Exception as exc:
            logger.warning("AI analysis failed (graceful degradation): %s", exc)
            return _empty_response()
