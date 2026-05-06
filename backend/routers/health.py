from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/api/health")
async def health(request: Request) -> dict:
    redis_ok = False
    try:
        redis = request.app.state.redis
        await redis.ping()
        redis_ok = True
    except Exception:
        pass
    return {"status": "ok", "redis": redis_ok}
