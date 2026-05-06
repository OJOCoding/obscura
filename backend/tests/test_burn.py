"""
Critical correctness test: concurrent reads must result in exactly one
200 and one 404 — proving burn-after-read is atomic.
"""
import asyncio
import base64
import pytest


VALID_CIPHERTEXT = base64.b64encode(b"\xde\xad\xbe\xef" * 7).decode()


@pytest.mark.asyncio
async def test_concurrent_reads_only_one_succeeds(client):
    create = await client.post(
        "/api/drops",
        json={"ciphertext": VALID_CIPHERTEXT, "ttl_seconds": 300},
    )
    assert create.status_code == 201
    drop_id = create.json()["drop_id"]

    results = await asyncio.gather(
        client.get(f"/api/drops/{drop_id}"),
        client.get(f"/api/drops/{drop_id}"),
        return_exceptions=True,
    )

    status_codes = sorted(r.status_code for r in results)
    assert status_codes == [200, 404], (
        f"Expected [200, 404] but got {status_codes}. "
        "Burn-after-read is not atomic!"
    )


@pytest.mark.asyncio
async def test_triple_concurrent_read_only_one_succeeds(client):
    create = await client.post(
        "/api/drops",
        json={"ciphertext": VALID_CIPHERTEXT, "ttl_seconds": 300},
    )
    drop_id = create.json()["drop_id"]

    results = await asyncio.gather(
        client.get(f"/api/drops/{drop_id}"),
        client.get(f"/api/drops/{drop_id}"),
        client.get(f"/api/drops/{drop_id}"),
        return_exceptions=True,
    )

    status_codes = sorted(r.status_code for r in results)
    successes = status_codes.count(200)
    assert successes == 1, f"Expected exactly 1 success, got {successes}: {status_codes}"
