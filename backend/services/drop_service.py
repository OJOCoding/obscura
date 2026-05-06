import hashlib
import hmac
import json
import time
from datetime import datetime, timezone

import redis.asyncio as aioredis
from ulid import ULID

from backend.config import settings
from backend.models.drop import DropCreate, DropCreateResponse, DropRead


class DropNotFoundError(Exception):
    """Raised when a drop doesn't exist or has already been burned."""


def _ip_hash(ip: str) -> str:
    """HMAC the IP with a daily-rotating secret so raw IPs are never stored."""
    day = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    key = (settings.hmac_secret + day).encode()
    return hmac.new(key, ip.encode(), hashlib.sha256).hexdigest()[:16]


class DropService:
    def __init__(self, redis: aioredis.Redis) -> None:
        self._redis = redis

    async def create(
        self,
        payload: DropCreate,
        ai_warnings: list[str] | None = None,
        ai_risk_level: str = "low",
        ai_analyzed: bool = False,
        sender_ip: str = "",
    ) -> DropCreateResponse:
        drop_id = str(ULID())
        now = int(time.time())
        expires_at = now + payload.ttl_seconds

        record = json.dumps({
            "ciphertext": payload.ciphertext,
            "ai_warnings": ai_warnings or [],
            "ai_risk_level": ai_risk_level,
            "ai_analyzed": ai_analyzed,
        })

        pipe = self._redis.pipeline()
        pipe.set(f"drop:{drop_id}", record, ex=payload.ttl_seconds)
        # Increment hourly aggregate for AI metadata (no PII)
        pipe.incr("meta:hourly_creates")
        pipe.expire("meta:hourly_creates", 3600)
        # Rate-limit counter
        if sender_ip:
            ip_hash = _ip_hash(sender_ip)
            pipe.incr(f"ratelimit:create:{ip_hash}:{now // 60}")
            pipe.expire(f"ratelimit:create:{ip_hash}:{now // 60}", 60)
        await pipe.execute()

        return DropCreateResponse(drop_id=drop_id, expires_at=expires_at)

    async def burn_and_read(self, drop_id: str) -> DropRead:
        """Atomically retrieve and delete the drop (burn-after-read)."""
        raw = await self._redis.getdel(f"drop:{drop_id}")
        if raw is None:
            raise DropNotFoundError(drop_id)

        # Increment hourly aggregate
        pipe = self._redis.pipeline()
        pipe.incr("meta:hourly_reads")
        pipe.expire("meta:hourly_reads", 3600)
        await pipe.execute()

        data = json.loads(raw)
        return DropRead(
            ciphertext=data["ciphertext"],
            ai_warnings=data.get("ai_warnings", []),
            ai_risk_level=data.get("ai_risk_level", "low"),
            ai_analyzed=data.get("ai_analyzed", False),
        )

    async def get_hourly_stats(self) -> tuple[int, int]:
        """Return (drops_created_in_last_hour, reads_in_last_hour)."""
        pipe = self._redis.pipeline()
        pipe.get("meta:hourly_creates")
        pipe.get("meta:hourly_reads")
        results = await pipe.execute()
        creates = int(results[0] or 0)
        reads = int(results[1] or 0)
        return creates, reads
