"""
intent_service.py — sender-intent guardrail backed by the Google Gemini API.

The browser computes summary statistics about the unencrypted plaintext
locally and ships ONLY those stats to this service. The model classifies
what kind of secret the message likely contains (password, API key, PII,
URL, normal prose…) and returns a short warning the sender can heed before
encrypting.

Zero-knowledge: no message content ever leaves the browser. The server
and Gemini see only the statistical fingerprint.

Talks to the Gemini REST endpoint directly via httpx — no SDK required.
"""
import json
import logging

import httpx

from backend.config import settings
from backend.models.intent import IntentCheckResponse, MessageStats

logger = logging.getLogger(__name__)


GEMINI_ENDPOINT = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent"
)

SYSTEM_PROMPT = """You are a sender-intent classifier for an end-to-end encrypted dead-drop messenger.

You receive ONLY anonymized statistics about a user's plaintext message — never the message itself.
Your job: judge what *kind* of secret the user is about to send and give them a short heads-up so
they can double-check the recipient before transmission.

Categories (pick exactly one):
- password           : short-to-medium high-entropy mixed string
- api_key            : longer high-entropy token, often hex/base64/prefixed
- credit_card        : Luhn-passing 13–19 digit run flagged by the client
- email_or_pii       : email/phone/address-shaped data
- url                : link-shaped string
- code_or_data       : looks like JSON, source code, or structured data
- normal_message     : prose / chat / regular human writing
- unknown            : nothing notable

Severity:
- critical : credentials, API keys, payment info — high blast-radius if mis-sent
- warning  : URLs, PII, structured data — worth a sanity check
- info     : ordinary prose — no action needed

Output STRICT JSON (no prose, no markdown):
{"category": "...", "severity": "...", "headline": "...", "advice": "...", "confidence": 0.0}

Rules:
- headline: ≤ 6 words, plain English (e.g. "Looks like an API key")
- advice:   1–2 sentences. Be concrete: "Confirm the recipient before sharing" beats "Be careful".
- confidence: 0.0–1.0
- For "normal_message" / "unknown" use severity="info" and an empty advice string.
"""


def _build_user_prompt(s: MessageStats) -> str:
    return (
        "Classify this message based on its statistical fingerprint:\n\n"
        f"- length: {s.length} chars\n"
        f"- char classes: lower={s.lowercase_count}, upper={s.uppercase_count}, "
        f"digits={s.digit_count}, special={s.special_count}, whitespace={s.whitespace_count}\n"
        f"- distinct chars: {s.distinct_chars}\n"
        f"- shannon entropy: {s.shannon_entropy_bits:.2f} bits/char\n"
        f"- longest unbroken (non-whitespace) run: {s.longest_unbroken_run} chars\n"
        f"- pattern flags: hex={s.looks_like_hex}, base64={s.looks_like_base64}, "
        f"url={s.has_url_pattern}, email={s.has_email_pattern}, "
        f"phone={s.has_phone_pattern}, credit_card={s.has_credit_card_pattern}\n"
    )


def _empty_response() -> IntentCheckResponse:
    return IntentCheckResponse(
        category="unknown",
        severity="info",
        headline="",
        advice="",
        confidence=0.0,
    )


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text[3:]
        if text.lower().startswith("json"):
            text = text[4:]
        if text.endswith("```"):
            text = text[:-3]
    return text.strip()


class IntentService:
    """Calls the Gemini API REST endpoint for sender-intent classification."""

    async def classify(self, stats: MessageStats) -> IntentCheckResponse:
        if not settings.gemini_api_key:
            logger.info("Intent guardrail unavailable: GEMINI_API_KEY not set")
            return _empty_response()

        url = GEMINI_ENDPOINT.format(model=settings.gemini_model)
        prompt = _build_user_prompt(stats)

        body = {
            "systemInstruction": {
                "parts": [{"text": SYSTEM_PROMPT}],
            },
            "contents": [
                {"role": "user", "parts": [{"text": prompt}]},
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 256,
                "responseMimeType": "application/json",
            },
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
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

            # Gemini responses: candidates[0].content.parts[0].text
            candidates = data.get("candidates") or []
            if not candidates:
                logger.warning("Gemini returned no candidates: %s", data)
                return _empty_response()

            parts = (candidates[0].get("content") or {}).get("parts") or []
            raw_text = next((p.get("text", "") for p in parts if p.get("text")), "")
            if not raw_text:
                return _empty_response()

            parsed = json.loads(_strip_code_fence(raw_text))

            return IntentCheckResponse(
                category=parsed.get("category", "unknown"),
                severity=parsed.get("severity", "info"),
                headline=str(parsed.get("headline", ""))[:80],
                advice=str(parsed.get("advice", ""))[:300],
                confidence=float(parsed.get("confidence", 0.0)),
            )

        except Exception as exc:
            # Graceful degradation — guardrail must NEVER block a drop.
            logger.warning("Intent classification failed (graceful degradation): %s", exc)
            return _empty_response()
