/**
 * api.js — fetch() wrappers for the Obscura backend API.
 *
 * SECURITY: These functions only transmit ciphertext + metadata.
 * The AES key lives in the URL fragment and is never passed here.
 */

const BASE = '/api'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw Object.assign(new Error(err.detail || 'Request failed'), { status: res.status })
  }
  return res.json()
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw Object.assign(new Error(err.detail || 'Request failed'), { status: res.status })
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a new dead drop.
 * @param {string} ciphertext - base64-encoded IV+ciphertext blob
 * @param {number} ttlSeconds - time-to-live in seconds
 * @returns {Promise<{ drop_id: string, expires_at: number }>}
 */
export async function createDrop(ciphertext, ttlSeconds) {
  return post('/drops', { ciphertext, ttl_seconds: ttlSeconds })
}

/**
 * Retrieve and burn a dead drop.
 * After this call the server deletes the message — it cannot be read again.
 * @param {string} dropId
 * @returns {Promise<{ ciphertext: string, ai_warnings: string[] }>}
 */
export async function readDrop(dropId) {
  return get(`/drops/${dropId}`)
}

/**
 * Request AI analysis of anonymized session metadata.
 * @param {object} metadata - SessionMetadata fields
 * @returns {Promise<{ warnings: string[], risk_level: string, analyzed_at: number }>}
 */
export async function analyzeMeta(metadata) {
  return post('/ai/analyze', { metadata })
}

/**
 * Sender-intent guardrail — classifies what kind of secret the user is about
 * to send based on summary statistics computed locally. Plaintext NEVER leaves
 * the browser. Backed by Vertex AI (Gemini) on the server.
 *
 * @param {object} stats - MessageStats fields from computeMessageStats()
 * @returns {Promise<{ category, severity, headline, advice, confidence }>}
 */
export async function intentCheck(stats) {
  return post('/ai/intent-check', { stats })
}
