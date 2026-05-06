/**
 * envelope.js — bundle a message + attached files into a single plaintext blob
 * that gets encrypted as one unit by crypto.js.
 *
 * The server sees only opaque ciphertext — it never knows whether a drop
 * carries text, files, or both.
 *
 * Envelope format (plaintext, before encryption):
 *   {
 *     "v": 1,
 *     "message": "hello",
 *     "files": [
 *       { "name": "doc.pdf", "type": "application/pdf", "size": 12345, "data": "<base64>" }
 *     ]
 *   }
 *
 * Backward compatibility: a plaintext that does NOT parse as a v=1 envelope is
 * treated as a plain text message (so old links still decrypt cleanly).
 */

const ENVELOPE_VERSION = 1

// ---------- base64 helpers (chunked, stack-safe for large files) ----------

const CHUNK = 0x8000 // 32 KB — safe for String.fromCharCode.apply

function bytesToBase64(bytes) {
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK)
    binary += String.fromCharCode.apply(null, slice)
  }
  return btoa(binary)
}

function base64ToBytes(b64) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

// ---------- file <-> object conversion ----------

async function fileToObject(file) {
  const buffer = await file.arrayBuffer()
  return {
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    data: bytesToBase64(new Uint8Array(buffer)),
  }
}

// ---------- envelope pack / unpack ----------

/**
 * Pack a message + File[] into a JSON envelope string ready for encryption.
 * Returns the stringified envelope. Reads file contents asynchronously.
 */
export async function packEnvelope(message, files) {
  const fileObjects = []
  for (const f of files) {
    fileObjects.push(await fileToObject(f))
  }
  return JSON.stringify({
    v: ENVELOPE_VERSION,
    message: message ?? '',
    files: fileObjects,
  })
}

/**
 * Try to parse plaintext as a v=1 envelope. If it isn't one, treat the entire
 * plaintext as a plain message (no files) so legacy drops still work.
 *
 * Returns: { message: string, files: Array<{name, type, size, data}> }
 */
export function unpackEnvelope(plaintext) {
  if (typeof plaintext !== 'string' || !plaintext.startsWith('{')) {
    return { message: plaintext, files: [] }
  }
  try {
    const parsed = JSON.parse(plaintext)
    if (parsed && parsed.v === ENVELOPE_VERSION && Array.isArray(parsed.files)) {
      return {
        message: typeof parsed.message === 'string' ? parsed.message : '',
        files: parsed.files,
      }
    }
  } catch {
    // not JSON — fall through
  }
  return { message: plaintext, files: [] }
}

// ---------- download helper ----------

/**
 * Trigger a browser download for a file object from an unpacked envelope.
 * Reconstructs a Blob from the base64 data and uses an anchor click.
 */
export function downloadFile(file) {
  const bytes = base64ToBytes(file.data)
  const blob = new Blob([bytes], { type: file.type || 'application/octet-stream' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = file.name || 'download'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Release the object URL after the click is handled
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ---------- size formatter ----------

export function formatBytes(n) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}
