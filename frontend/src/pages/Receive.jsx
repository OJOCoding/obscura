import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { decryptMessage } from '../lib/crypto.js'
import { readDrop } from '../lib/api.js'
import { unpackEnvelope, downloadFile, formatBytes } from '../lib/envelope.js'
import TerminalBox from '../components/TerminalBox.jsx'
import BurnAnimation from '../components/BurnAnimation.jsx'
import AiResponseBox from '../components/AiResponseBox.jsx'
import FileChip from '../components/FileChip.jsx'

const WIPE_AFTER_SECONDS = 60

export default function Receive() {
  const { dropId } = useParams()

  const [status, setStatus] = useState('loading')  // loading | decrypting | ready | wiped | error | burned
  const [plaintext, setPlaintext] = useState('')
  const [files, setFiles] = useState([])
  const [errorMsg, setErrorMsg] = useState('')
  const [aiWarnings, setAiWarnings] = useState([])
  const [aiRiskLevel, setAiRiskLevel] = useState('low')
  const [aiAnalyzed, setAiAnalyzed] = useState(false)
  const [countdown, setCountdown] = useState(WIPE_AFTER_SECONDS)
  const [showBurn, setShowBurn] = useState(false)

  const timerRef = useRef(null)
  const fetchedRef = useRef(false)

  useEffect(() => {
    // Guard against double-invocation (StrictMode, HMR, etc.) — burning a
    // dead drop is a destructive one-shot operation.
    if (fetchedRef.current) return
    fetchedRef.current = true

    async function fetch() {
      // Extract key from URL fragment — never transmitted to server
      const fragment = window.location.hash.slice(1) // strip leading '#'
      if (!fragment) {
        setErrorMsg('No decryption key found in link. The link may be incomplete.')
        setStatus('error')
        return
      }

      try {
        setStatus('loading')
        const data = await readDrop(dropId)
        setAiWarnings(data.ai_warnings || [])
        setAiRiskLevel(data.ai_risk_level || 'low')
        setAiAnalyzed(Boolean(data.ai_analyzed))

        setStatus('decrypting')
        const text = await decryptMessage(data.ciphertext, fragment)

        // Try to unpack as a v=1 envelope; falls back to plain text for legacy drops
        const { message, files: attached } = unpackEnvelope(text)
        setPlaintext(message)
        setFiles(attached)
        setShowBurn(true)
        setStatus('ready')

        // Auto-wipe countdown
        timerRef.current = setInterval(() => {
          setCountdown(c => {
            if (c <= 1) {
              clearInterval(timerRef.current)
              setPlaintext('')
              setFiles([])
              setStatus('wiped')
              return 0
            }
            return c - 1
          })
        }, 1000)
      } catch (err) {
        if (err.status === 404) {
          setStatus('burned')
        } else {
          setErrorMsg(err.message || 'Decryption failed. The link may be corrupted or the key is wrong.')
          setStatus('error')
        }
      }
    }

    fetch()
    return () => clearInterval(timerRef.current)
  }, [dropId])

  // ---- Burned / not found ----
  if (status === 'burned') {
    return (
      <main className="page">
        <div className="page__inner">
          <div className="signal-lost">
            <div style={{ fontSize: 48, opacity: 0.4 }}>◉</div>
            <h1 className="signal-lost__title">Signal Lost</h1>
            <p className="signal-lost__sub">
              This transmission has been destroyed or never existed.
              Dead drops can only be read once.
            </p>
            <p className="signal-lost__link">
              <a href="/">Create a new drop</a>
            </p>
          </div>
        </div>
      </main>
    )
  }

  // ---- Error ----
  if (status === 'error') {
    return (
      <main className="page">
        <div className="page__inner">
          <TerminalBox title="Error">
            <p style={{ color: 'var(--red)', fontSize: 13 }}>{errorMsg}</p>
            <p className="text-sm text-steel mt-16">
              <a href="/">Return to Obscura</a>
            </p>
          </TerminalBox>
        </div>
      </main>
    )
  }

  const totalFileBytes = files.reduce((s, f) => s + (f.size || 0), 0)

  return (
    <main className="page">
      <div className="page__inner">
        <TerminalBox title="Incoming transmission">

          {/* Loading */}
          {(status === 'loading' || status === 'decrypting') && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span className="spinner" />
              <span className="text-sm text-steel">
                {status === 'loading' ? 'Retrieving encrypted transmission...' : 'Decrypting in browser...'}
              </span>
            </div>
          )}

          {/* Plaintext + attachments */}
          {status === 'ready' && (
            <>
              {plaintext && (
                <pre className="receive__plaintext">{plaintext}</pre>
              )}

              {files.length > 0 && (
                <div className="receive__attachments">
                  <p className="receive__attachments-title">
                    {files.length} attachment{files.length === 1 ? '' : 's'} · {formatBytes(totalFileBytes)}
                  </p>
                  <div className="file-list">
                    {files.map((f, i) => (
                      <FileChip
                        key={`${f.name}-${i}`}
                        file={f}
                        mode="receive"
                        onDownload={() => downloadFile(f)}
                      />
                    ))}
                  </div>
                  <p className="receive__attachments-hint">
                    Download now — files are wiped from this page in {countdown}s and were already deleted from the server.
                  </p>
                </div>
              )}

              {!plaintext && files.length === 0 && (
                <p style={{ color: 'var(--steel)', fontSize: 13 }}>
                  Empty transmission.
                </p>
              )}

              <div className="receive__burn-notice">
                This message has been permanently deleted from the server.
              </div>
              <p className="receive__wipe-countdown">
                Screen clears in {countdown}s
              </p>
            </>
          )}

          {/* Wiped */}
          {status === 'wiped' && (
            <p style={{ color: 'var(--steel)', fontSize: 13 }}>
              Message wiped from screen. It was deleted from the server when you opened this link.
            </p>
          )}
        </TerminalBox>

        {/* Burn animation — shown immediately after decryption */}
        {showBurn && status === 'ready' && (
          <div className="mt-24">
            <BurnAnimation />
          </div>
        )}

        {/* Gemini metadata-leak analysis — always shown so the feature is
            visible even on drops with zero warnings. */}
        {status === 'ready' && (
          <div className="mt-24">
            <AiResponseBox
              analyzed={aiAnalyzed}
              warnings={aiWarnings}
              riskLevel={aiRiskLevel}
            />
          </div>
        )}
      </div>
    </main>
  )
}
