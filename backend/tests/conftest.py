import pytest
import fakeredis.aioredis as fakeredis
import httpx
from fastapi.testclient import TestClient

from backend.main import app


@pytest.fixture
async def fake_redis():
    """Async fake Redis instance, reset between tests."""
    r = fakeredis.FakeRedis(decode_responses=True)
    yield r
    await r.aclose()


@pytest.fixture
async def client(fake_redis):
    """AsyncClient with fake Redis injected into app state."""
    app.state.redis = fake_redis
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
