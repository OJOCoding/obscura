from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from backend.dependencies import get_redis, limiter
from backend.models.ai import SessionMetadata
from backend.models.drop import DropCreate, DropCreateResponse, DropRead
from backend.services.ai_service import AIService
from backend.services.drop_service import DropNotFoundError, DropService

router = APIRouter(prefix="/api/drops", tags=["drops"])

_ai_service = AIService()


def _get_drop_service(request: Request) -> DropService:
    return DropService(request.app.state.redis)


@router.post("", response_model=DropCreateResponse, status_code=201)
@limiter.limit("10/minute")
async def create_drop(
    request: Request,
    payload: DropCreate,
) -> DropCreateResponse:
    svc = _get_drop_service(request)
    sender_ip = request.client.host if request.client else ""

    # Pre-compute metadata-leak warnings (Gemini) so they travel with the drop
    # and are visible to the recipient. Graceful degradation: any failure
    # returns an empty list and never blocks the drop.
    creates, reads = await svc.get_hourly_stats()
    now_utc = datetime.now(timezone.utc)
    ai_result = await _ai_service.analyze(SessionMetadata(
        hour_of_day=now_utc.hour,
        day_of_week=now_utc.weekday(),
        ttl_chosen_seconds=payload.ttl_seconds,
        # Cap to model's declared bound — large drops collapse to 'big' bucket.
        ciphertext_size_bytes=min(len(payload.ciphertext), 131072),
        drops_created_in_last_hour=creates,
        reads_in_last_hour=reads,
    ))

    # ai_analyzed reflects whether the API key was configured at create time —
    # lets the recipient distinguish "AI ran and was silent" from "AI was off".
    from backend.config import settings
    ai_analyzed = bool(settings.gemini_api_key)

    return await svc.create(
        payload,
        ai_warnings=ai_result.warnings,
        ai_risk_level=ai_result.risk_level,
        ai_analyzed=ai_analyzed,
        sender_ip=sender_ip,
    )


@router.get("/{drop_id}", response_model=DropRead)
@limiter.limit("20/minute")
async def read_drop(
    request: Request,
    drop_id: str,
) -> DropRead:
    svc = _get_drop_service(request)
    try:
        return await svc.burn_and_read(drop_id)
    except DropNotFoundError:
        # Return identical 404 body whether "never existed" or "already burned"
        # to prevent oracle enumeration.
        raise HTTPException(
            status_code=404,
            detail="Drop not found or already read.",
        )
