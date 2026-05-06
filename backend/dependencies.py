from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
import redis.asyncio as aioredis

limiter = Limiter(key_func=get_remote_address)


async def get_redis(request: Request) -> aioredis.Redis:
    return request.app.state.redis
