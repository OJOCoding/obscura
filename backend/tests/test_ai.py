"""
AI route tests — mock the Anthropic client to avoid real API calls.
"""
import json
import time
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


SAMPLE_METADATA = {
    "hour_of_day": 3,
    "day_of_week": 0,
    "ttl_chosen_seconds": 300,
    "ciphertext_size_bytes": 64,
    "reads_in_last_hour": 0,
    "drops_created_in_last_hour": 0,
}

MOCK_RESPONSE_JSON = json.dumps({
    "warnings": ["Short TTL at 03:00 UTC creates a distinct behavioral signature."],
    "risk_level": "medium",
})


def _make_mock_message(text: str):
    content_block = MagicMock()
    content_block.text = text
    msg = MagicMock()
    msg.content = [content_block]
    return msg


@pytest.mark.asyncio
async def test_analyze_returns_warnings(client):
    with patch("backend.services.ai_service.settings") as mock_settings, \
         patch("backend.services.ai_service.anthropic.AsyncAnthropic") as mock_anthropic:

        mock_settings.anthropic_api_key = "sk-test"
        mock_instance = AsyncMock()
        mock_instance.messages.create = AsyncMock(
            return_value=_make_mock_message(MOCK_RESPONSE_JSON)
        )
        mock_anthropic.return_value = mock_instance

        r = await client.post("/api/ai/analyze", json={"metadata": SAMPLE_METADATA})

    assert r.status_code == 200
    data = r.json()
    assert "warnings" in data
    assert "risk_level" in data
    assert data["risk_level"] in ("low", "medium", "high")


@pytest.mark.asyncio
async def test_analyze_graceful_degradation_on_api_failure(client):
    """If Claude API throws, response should be empty warnings / low risk."""
    with patch("backend.services.ai_service.settings") as mock_settings, \
         patch("backend.services.ai_service.anthropic.AsyncAnthropic") as mock_anthropic:

        mock_settings.anthropic_api_key = "sk-test"
        mock_instance = AsyncMock()
        mock_instance.messages.create = AsyncMock(side_effect=Exception("API unavailable"))
        mock_anthropic.return_value = mock_instance

        r = await client.post("/api/ai/analyze", json={"metadata": SAMPLE_METADATA})

    assert r.status_code == 200
    data = r.json()
    assert data["warnings"] == []
    assert data["risk_level"] == "low"


@pytest.mark.asyncio
async def test_analyze_no_api_key_returns_empty(client):
    """No API key configured → graceful empty response."""
    with patch("backend.services.ai_service.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""

        r = await client.post("/api/ai/analyze", json={"metadata": SAMPLE_METADATA})

    assert r.status_code == 200
    data = r.json()
    assert data["warnings"] == []


@pytest.mark.asyncio
async def test_analyze_invalid_metadata_rejected(client):
    r = await client.post(
        "/api/ai/analyze",
        json={"metadata": {"hour_of_day": 99}},  # hour_of_day > 23
    )
    assert r.status_code == 422
