/**
 * messageStats.js — compute an anonymized statistical fingerprint of a
 * plaintext message *in the browser*, so the server (and any downstream LLM)
 * can classify sender intent without ever seeing the message itself.
 *
 * Output shape matches backend MessageStats Pydantic model.
 */

const URL_RE         = /\b(?:https?:\/\/|www\.)\S+/i
const EMAIL_RE       = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i
const PHONE_RE       = /(?:\+?\d[\s\-().]?){7,}\d/
const HEX_RE         = /^[0-9a-f]{16,}$/i
const BASE64_RE      = /^[A-Za-z0-9+/=_-]{20,}$/
const DIGIT_RUN_RE   = /\d[\d\s-]{11,21}\d/g  // 13–19 digit candidate runs

/** Shannon entropy in bits/char. */
function shannonEntropy(text) {
  if (!text) return 0
  const counts = new Map()
  for (const ch of text) counts.set(ch, (counts.get(ch) || 0) + 1)
  const n = text.length
  let h = 0
  for (const c of counts.values()) {
    const p = c / n
    h -= p * Math.log2(p)
  }
  return h
}

/** Luhn check — used to confirm that a digit run is a real card-shaped number. */
function luhnPasses(digits) {
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = +digits[i]
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum > 0 && sum % 10 === 0
}

function detectCreditCard(text) {
  const matches = text.match(DIGIT_RUN_RE) || []
  for (const m of matches) {
    const digits = m.replace(/\D/g, '')
    if (digits.length >= 13 && digits.length <= 19 && luhnPasses(digits)) return true
  }
  return false
}

/** Longest run of consecutive non-whitespace chars — high values suggest tokens. */
function longestUnbrokenRun(text) {
  let max = 0
  let cur = 0
  for (const ch of text) {
    if (/\s/.test(ch)) {
      if (cur > max) max = cur
      cur = 0
    } else {
      cur++
    }
  }
  return Math.max(max, cur)
}

/**
 * Compute message statistics. Pure function — no I/O, no DOM access.
 * Input: string (the plaintext)
 * Output: object matching the backend's MessageStats schema.
 */
export function computeMessageStats(text) {
  const t = text ?? ''
  const len = t.length

  let lower = 0, upper = 0, digits = 0, ws = 0, special = 0
  for (const ch of t) {
    if (ch >= 'a' && ch <= 'z') lower++
    else if (ch >= 'A' && ch <= 'Z') upper++
    else if (ch >= '0' && ch <= '9') digits++
    else if (/\s/.test(ch)) ws++
    else special++
  }

  // Trim for single-token detection (so "  abc123  " still classifies cleanly)
  const trimmed = t.trim()

  return {
    length: len,
    lowercase_count: lower,
    uppercase_count: upper,
    digit_count: digits,
    special_count: special,
    whitespace_count: ws,

    shannon_entropy_bits: Number(shannonEntropy(t).toFixed(3)),
    longest_unbroken_run: longestUnbrokenRun(t),
    distinct_chars: new Set(t).size,

    looks_like_hex:    HEX_RE.test(trimmed),
    looks_like_base64: BASE64_RE.test(trimmed) && !/\s/.test(trimmed),
    has_url_pattern:   URL_RE.test(t),
    has_email_pattern: EMAIL_RE.test(t),
    has_phone_pattern: PHONE_RE.test(t),
    has_credit_card_pattern: detectCreditCard(t),
  }
}
