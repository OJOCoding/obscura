/**
 * crypto.js — All AES-256-GCM Web Crypto operations for Obscura.
 *
 * SECURITY: This file must only run in the browser. The AES key never
 * leaves this module over the network — it is embedded in the URL fragment
 * (#key=...) which browsers do not transmit in HTTP requests (RFC 3986).
 */

const ALGORITHM = { name: 'AES-GCM', length: 256 }
const IV_BYTES = 12  // 96-bit IV recommended for AES-GCM

// ---------------------------------------------------------------------------
// Base64url helpers (URL-safe, no padding)
// ---------------------------------------------------------------------------

function toBase64url(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function fromBase64url(str) {
  // Restore standard base64 padding
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Standard base64 (for ciphertext blob stored on server)
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function fromBase64(str) {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a fresh AES-256-GCM key.
 * @returns {{ key: CryptoKey, keyBase64url: string }}
 */
export async function generateKey() {
  const key = await crypto.subtle.generateKey(ALGORITHM, true, ['encrypt', 'decrypt'])
  const raw = await crypto.subtle.exportKey('raw', key)
  return { key, keyBase64url: toBase64url(raw) }
}

/**
 * Encrypt a plaintext string.
 * The IV is prepended to the ciphertext before base64-encoding.
 *
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<string>} base64-encoded blob: IV[12 bytes] + ciphertext
 */
export async function encryptMessage(plaintext, key) {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  // Concatenate IV + ciphertext into one blob
  const blob = new Uint8Array(IV_BYTES + ciphertext.byteLength)
  blob.set(iv, 0)
  blob.set(new Uint8Array(ciphertext), IV_BYTES)

  return toBase64(blob.buffer)
}

/**
 * Decrypt a ciphertext blob.
 *
 * @param {string} ciphertextBase64 - base64 blob: IV[12 bytes] + ciphertext
 * @param {string} keyBase64url - base64url-encoded raw key bytes
 * @returns {Promise<string>} decrypted plaintext
 * @throws {DOMException} if key is wrong or data is corrupted
 */
export async function decryptMessage(ciphertextBase64, keyBase64url) {
  const rawKey = fromBase64url(keyBase64url)
  const key = await crypto.subtle.importKey('raw', rawKey, ALGORITHM, false, ['decrypt'])

  const blob = new Uint8Array(fromBase64(ciphertextBase64))
  const iv = blob.slice(0, IV_BYTES)
  const ciphertext = blob.slice(IV_BYTES)

  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)
  return new TextDecoder().decode(plaintext)
}
