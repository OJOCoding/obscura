import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { generateKey, encryptMessage } from '../lib/crypto.js'
import { createDrop, intentCheck } from '../lib/api.js'
import { packEnvelope, formatBytes } from '../lib/envelope.js'
import { computeMessageStats } from '../lib/messageStats.js'
import TerminalBox from '../components/TerminalBox.jsx'
import CopyLinkButton from '../components/CopyLinkButton.jsx'
import SecurityBriefingModal, { needsBriefing } from '../components/SecurityBriefingModal.jsx'
import FileDropZone from '../components/FileDropZone.jsx'
import FileChip from '../components/FileChip.jsx'
import IntentWarning from '../components/IntentWarning.jsx'

const INTENT_DEBOUNCE_MS = 800
const INTENT_MIN_CHARS = 8

const MAX_CHARS = 10000
const MAX_FILE_BYTES  = 5  * 1024 * 1024   // 5 MB per file
const MAX_TOTAL_BYTES = 10 * 1024 * 1024   // 10 MB across all files

const TTL_OPTIONS = [
  { label: '5 min',  value: 300 },
  { label: '1 hr',   value: 3600 },
  { label: '24 hr',  value: 86400 },
  { label: '7 days', value: 604800 },
]

export default function Compose() {
  const [showBriefing, setShowBriefing] = useState(needsBriefing)
  const [message, setMessage]   = useState('')
  const [files, setFiles]       = useState([])           // File[]
  const [ttl, setTtl]           = useState(86400)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [dropLink, setDropLink] = useState('')

  // Sender-intent guardrail (Vertex AI / Gemini)
  const [intentResult, setIntentResult] = useState(null)
  const [intentDismissed, setIntentDismissed] = useState(false)
  const intentSeqRef = useRef(0)

  const totalBytes = useMemo(
    () => files.reduce((sum, f) => sum + f.size, 0),
    [files],
  )

  // ---- Intent guardrail: debounced classification of message stats ----
  // The plaintext NEVER leaves the browser — only summary stats are sent.
  useEffect(() => {
    setIntentDismissed(false)

    const trimmed = message.trim()
    if (trimmed.length < INTENT_MIN_CHARS) {
      setIntentResult(null)
      return
    }

    const seq = ++intentSeqRef.current
    const handle = setTimeout(async () => {
      try {
        const stats = computeMessageStats(message)
        const result = await intentCheck(stats)
        // Drop stale results if user kept typing
        if (seq === intentSeqRef.current) setIntentResult(result)
      } catch {
        // Guardrail must never break composition — fail silently
        if (seq === intentSeqRef.current) setIntentResult(null)
      }
    }, INTENT_DEBOUNCE_MS)

    return () => clearTimeout(handle)
  }, [message])

  const handleAddFiles = useCallback((incoming) => {
    setError('')
    setFiles(prev => {
      const next = [...prev]
      let runningTotal = next.reduce((s, f) => s + f.size, 0)

      for (const f of incoming) {
        if (f.size > MAX_FILE_BYTES) {
          setError(`"${f.name}" is ${formatBytes(f.size)} — files must be ≤ ${formatBytes(MAX_FILE_BYTES)}.`)
          continue
        }
        if (runningTotal + f.size > MAX_TOTAL_BYTES) {
          setError(`Total attachments would exceed ${formatBytes(MAX_TOTAL_BYTES)}.`)
          break
        }
        // De-dup by name+size
        if (next.some(existing => existing.name === f.name && existing.size === f.size)) continue
        next.push(f)
        runningTotal += f.size
      }
      return next
    })
  }, [])

  const handleRemoveFile = useCallback((idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const canSubmit = (message.trim().length > 0 || files.length > 0) && !loading

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')

    try {
      // 1. Pack message + files into a single plaintext envelope
      const plaintext = await packEnvelope(message, files)

      // 2. Encrypt the envelope in the browser
      const { key, keyBase64url } = await generateKey()
      const ciphertext = await encryptMessage(plaintext, key)

      // 3. Upload ciphertext (server has no idea what's inside)
      const dropResult = await createDrop(ciphertext, ttl)

      // 4. Assemble link — key goes in fragment, never transmitted
      const base = `${window.location.origin}/drop/${dropResult.drop_id}`
      setDropLink(`${base}#${keyBase64url}`)
    } catch (err) {
      setError(err.message || 'Failed to create drop. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [message, files, ttl, canSubmit])

  const handleReset = () => {
    setMessage('')
    setFiles([])
    setDropLink('')
    setError('')
    setIntentResult(null)
    setIntentDismissed(false)
  }

  return (
    <>
      {showBriefing && <SecurityBriefingModal onConfirm={() => setShowBriefing(false)} />}

      <main className="page">
        <div className="page__inner">
          <p className="compose__tagline">Encrypted Dead Drop Messenger</p>

          <TerminalBox title="Compose transmission">
            {!dropLink ? (
              <>
                <label className="compose__label" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  className="compose__textarea"
                  placeholder="Type your secret message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value.slice(0, MAX_CHARS))}
                  disabled={loading}
                />
                <p className={`compose__char-count ${message.length > MAX_CHARS * 0.9 ? 'compose__char-count--warn' : ''}`}>
                  {message.length} / {MAX_CHARS}
                </p>

                <IntentWarning
                  result={intentResult}
                  dismissed={intentDismissed}
                  onDismiss={() => setIntentDismissed(true)}
                />

                <label className="compose__label" style={{ marginTop: 20 }}>
                  Attachments <span className="compose__label-hint">(optional)</span>
                </label>
                <FileDropZone onAdd={handleAddFiles} disabled={loading} />

                {files.length > 0 && (
                  <>
                    <div className="file-list">
                      {files.map((f, i) => (
                        <FileChip
                          key={`${f.name}-${f.size}-${i}`}
                          file={f}
                          mode="compose"
                          onRemove={() => handleRemoveFile(i)}
                        />
                      ))}
                    </div>
                    <p className="file-list__total">
                      {files.length} file{files.length === 1 ? '' : 's'} · {formatBytes(totalBytes)} / {formatBytes(MAX_TOTAL_BYTES)}
                    </p>
                  </>
                )}

                <div className="compose__options">
                  <div>
                    <label className="compose__label">Self-destructs after</label>
                    <div className="ttl-selector">
                      {TTL_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          className={`ttl-selector__btn ${ttl === opt.value ? 'ttl-selector__btn--active' : ''}`}
                          onClick={() => setTtl(opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {error && (
                  <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 12 }}>{error}</p>
                )}

                <button
                  className="compose__submit"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                >
                  {loading ? 'Encrypting...' : '▶ Create Dead Drop'}
                </button>
              </>
            ) : (
              <>
                <p className="text-xs text-steel uppercase" style={{ marginBottom: 12 }}>
                  Transmission ready
                </p>
                <CopyLinkButton url={dropLink} />
                <button className="link-display__reset" onClick={handleReset}>
                  Create another drop
                </button>
              </>
            )}
          </TerminalBox>

        </div>
      </main>
    </>
  )
}
