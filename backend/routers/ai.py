from fastapi import APIRouter, Request

from backend.dependencies import limiter
from backend.models.ai import AIAnalysisRequest, AIAnalysisResponse
from backend.models.intent import IntentCheckRequest, IntentCheckResponse
from backend.services.ai_service import AIService
from backend.services.intent_service import IntentService

router = APIRouter(prefix="/api/ai", tags=["ai"])

_intent_service = IntentService()


@router.post("/analyze", response_model=AIAnalysisResponse)
@limiter.limit("5/minute")
async def analyze_metadata(
    request: Request,
    payload: AIAnalysisRequest,
) -> AIAnalysisResponse:
    svc = AIService()
    return await svc.analyze(payload.metadata)


@router.post("/intent-check", response_model=IntentCheckResponse)
@limiter.limit("20/minute")
async def intent_check(
    request: Request,
    payload: IntentCheckRequest,
) -> IntentCheckResponse:
    """
    Sender-intent guardrail. Receives ONLY anonymized message statistics
    (length, char-class counts, entropy, regex flags) — never plaintext.
    Returns a category + advice the browser shows before encryption.
    """
    return await _intent_service.classify(payload.stats)
