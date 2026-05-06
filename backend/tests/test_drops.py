import base64
import pytest


VALID_CIPHERTEXT = base64.b64encode(b"\x00" * 28).decode()  # 28 bytes (12 IV + 16 min tag)


@pytest.mark.asyncio
async def test_create_drop_returns_201(client):
    r = await client.post(
        "/api/drops",
        json={"ciphertext": VALID_CIPHERTEXT, "ttl_seconds": 3600},
    )
    assert r.status_code == 201
    data = r.json()
    assert "drop_id" in data
    assert "expires_at" in data


@pytest.mark.asyncio
async def test_create_drop_default_ttl(client):
    r = await client.post("/api/drops", json={"ciphertext": VALID_CIPHERTEXT})
    assert r.status_code == 201


@pytest.mark.asyncio
async def test_read_drop_once_succeeds(client):
    create = await client.post(
        "/api/drops",
        json={"ciphertext": VALID_CIPHERTEXT, "ttl_seconds": 3600},
    )
    drop_id = create.json()["drop_id"]

    read = await client.get(f"/api/drops/{drop_id}")
    assert read.status_code == 200
    data = read.json()
    assert data["ciphertext"] == VALID_CIPHERTEXT


@pytest.mark.asyncio
async def test_read_drop_twice_returns_404(client):
    create = await client.post(
        "/api/drops",
        json={"ciphertext": VALID_CIPHERTEXT, "ttl_seconds": 3600},
    )
    drop_id = create.json()["drop_id"]

    await client.get(f"/api/drops/{drop_id}")
    second = await client.get(f"/api/drops/{drop_id}")
    assert second.status_code == 404


@pytest.mark.asyncio
async def test_read_nonexistent_drop_returns_404(client):
    r = await client.get("/api/drops/NONEXISTENT000000000000000")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_invalid_base64_rejected(client):
    r = await client.post(
        "/api/drops",
        json={"ciphertext": "not!!valid!!base64", "ttl_seconds": 3600},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_ttl_too_short_rejected(client):
    r = await client.post(
        "/api/drops",
        json={"ciphertext": VALID_CIPHERTEXT, "ttl_seconds": 60},
    )
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_ttl_too_long_rejected(client):
    r = await client.post(
        "/api/drops",
        json={"ciphertext": VALID_CIPHERTEXT, "ttl_seconds": 999999},
    )
    assert r.status_code == 422
