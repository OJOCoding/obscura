"""
intent.py — models for the sender-intent guardrail.

The browser computes summary statistics about the *unencrypted* message
locally and sends ONLY those stats to the server. The server (and Vertex AI)
never see the message content — preserving the zero-knowledge guarantee.
"""
from typing import Literal
from pydantic import BaseModel, Field


class MessageStats(BaseModel):
    """Anonymized statistical fingerprint of the sender's plaintext."""

    length: int = Field(ge=0, le=10_000)
    lowercase_count: int = Field(ge=0)
    uppercase_count: int = Field(ge=0)
    digit_count: int = Field(ge=0)
    special_count: int = Field(ge=0)
    whitespace_count: int = Field(ge=0)

    shannon_entropy_bits: float = Field(ge=0.0, le=8.0)
    longest_unbroken_run: int = Field(ge=0)
    distinct_chars: int = Field(ge=0)

    # Pattern flags — booleans the client computes via regex
    looks_like_hex: bool = False
    looks_like_base64: bool = False
    has_url_pattern: bool = False
    has_email_pattern: bool = False
    has_phone_pattern: bool = False
    has_credit_card_pattern: bool = False  # Luhn-passing 13–19 digit run


class IntentCheckRequest(BaseModel):
    stats: MessageStats


# What category does the message fingerprint resemble?
IntentCategory = Literal[
    "password",
    "api_key",
    "credit_card",
    "email_or_pii",
    "url",
    "code_or_data",
    "normal_message",
    "unknown",
]

IntentSeverity = Literal["info", "warning", "critical"]


class IntentCheckResponse(BaseModel):
    category: IntentCategory = "unknown"
    severity: IntentSeverity = "info"
    headline: str = ""           # short, e.g. "Looks like an API key"
    advice: str = ""             # 1–2 sentence actionable guidance
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
