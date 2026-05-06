# Obscura

**Encrypted dead-drop messenger — zero-knowledge, burn-after-read.**

Messages are encrypted in the sender's browser with AES-256-GCM and stored
only as opaque ciphertext. The decryption key travels in the URL fragment
(never transmitted to the server) and the record is atomically destroyed the
first time it's read. Neither the server nor its operator can decrypt drops
in transit or at rest.

---

## Features

- **End-to-end AES-256-GCM** via the Web Crypto API — key generated and used
  entirely in-browser
- **Burn-after-read** with atomic Redis `GETDEL` — concurrent reads can
  never duplicate a drop
- **File attachments** — up to 5 MB per file, 10 MB total, bundled with the
  message into an encrypted envelope
- **Sender-intent guardrail** — two-layer: an instant local heuristic
  classifier plus a Gemini refinement pass that flags API keys, passwords,
  credit cards, PII, and URLs *before* encryption, using only anonymized
  statistics (plaintext never leaves the browser)
- **Metadata-leak analysis** — Gemini inspects anonymized session stats
  (hour, TTL, ciphertext size, hourly platform traffic) and flags
  behavioral fingerprints that could leak operational information even
  when the encryption itself holds
- **QR code air-gap transfer** — scan the drop link to a second device
  without pasting it into a chat app that would preview and burn it
- **Clipboard auto-clear** — overwrites the paste buffer 30 seconds after
  copy, only if you haven't copied something newer
- **Live expiry countdown** on the ready page + 60-second recipient-side
  DOM auto-wipe
- **Dark + light theme** with pre-paint script (no FOUC), strict CSP,
  `Referrer-Policy: no-referrer`, HMAC-rotating IP hashes for rate limits
  (no raw IPs stored)

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Python 3.12 · FastAPI · Uvicorn · Pydantic v2 |
| Storage | Redis (drops + rate-limit counters, TTL-bounded) |
| Frontend | Vite · React 18 · React Router · Web Crypto API |
| AI | Google Gemini API (REST) — intent guardrail + metadata analysis |

---

## Quick start

### Prerequisites
- Python 3.12+
- Node 18+
- Redis running on `localhost:6379` (Docker, Memurai on Windows, or managed)
- A Gemini API key (optional — AI features short-circuit cleanly without one).
  Get one at https://aistudio.google.com/apikey

### Clone & configure

```bash
git clone https://github.com/<your-username>/obscura.git
cd obscura
cp .env.example .env
# Edit .env — at minimum add GEMINI_API_KEY if you want the AI features
```

### Backend

```bash
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux / Git Bash
source .venv/bin/activate

pip install -e ".[dev]"
uvicorn backend.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173.

---

## Environment variables

See [`.env.example`](.env.example). The important ones:

| Var | Purpose |
|---|---|
| `REDIS_URL` | Redis connection string |
| `HMAC_SECRET` | 32 random bytes used to hash IPs for rate-limiting |
| `CORS_ORIGINS` | JSON array of allowed origins |
| `ENVIRONMENT` | `development` or `production` |
| `GEMINI_API_KEY` | Optional. Enables both AI features |
| `GEMINI_MODEL` | Defaults to `gemini-2.5-flash` |

---

## HTTP API

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/drops` | Create a drop (body: `{ ciphertext, ttl_seconds }`) |
| `GET`  | `/api/drops/{id}` | Read & burn. Identical 404 for burned vs. never-existed |
| `POST` | `/api/ai/intent-check` | Guardrail — accepts only message stats, not text |
| `POST` | `/api/ai/analyze` | Metadata-leak analysis from anonymized session stats |
| `GET`  | `/api/health` | Liveness + Redis ping |

Full details on the in-app `/docs` route.

---

## Architecture notes

- **Key transport**: the AES key is base64url-encoded and appended to the
  share link as a URL fragment (`/drop/{id}#{key}`). Per RFC 3986, browsers
  never transmit fragments in HTTP request lines, server logs, or referrer
  headers — so the server cannot learn the key even if it tries.
- **Envelope format**: drops can carry text, files, or both. The browser
  bundles them into a versioned JSON envelope *before* encryption, so the
  server still sees only opaque ciphertext regardless of what's inside.
- **Zero-knowledge AI**: both AI features receive only numbers and booleans
  derived locally from the plaintext — never the plaintext itself. Failures
  degrade silently and can never block a drop.
- **Double-burn prevention**: the recipient page guards against React
  StrictMode double-invocation with a `useRef` flag, and the actual read
  uses Redis `GETDEL` which is atomic at the database level.

---

## Threat model

**In scope**

- Server compromise — operator cannot read past or future drops
- Network observer — sees only ciphertext + size + timing
- Replay / second-read — atomic `GETDEL` prevents reuse
- Drop enumeration — 122-bit ULIDs, identical 404s for burned vs. never-existed

**Out of scope**

- Compromised sender or recipient device
- Hostile browser extensions with DOM access
- Link leakage through chat-app previews, browser history, or screenshots
- Traffic-analysis correlation against ISP records

---

## Running in production

1. Set `ENVIRONMENT=production` (disables the auto-generated `/docs` and
   `/redoc` OpenAPI routes)
2. Provide a real `HMAC_SECRET` (`python -c "import secrets; print(secrets.token_hex(32))"`)
3. Use a managed Redis with TLS + auth
4. Run behind an HTTPS reverse proxy — HSTS is already set but only matters
   over TLS
5. Build the frontend (`cd frontend && npm run build`) — the FastAPI app
   serves `dist/` as a SPA fallback on all non-`/api` paths
6. Rotate `GEMINI_API_KEY` periodically and restrict it to the Generative
   Language API in Google Cloud Console

---

## License

MIT.

---
