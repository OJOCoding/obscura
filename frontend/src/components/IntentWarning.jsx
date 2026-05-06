/**
 * IntentWarning — non-blocking advisory shown when the Vertex AI guardrail
 * thinks the user is about to send a credential, PII, or other high-stakes
 * payload.
 *
 * The classification is computed from anonymized stats only — the model
 * never sees the plaintext.
 */

const SEVERITY_LABELS = {
  critical: 'Sensitive data detected',
  warning:  'Heads-up',
  info:     'Note',
}

export default function IntentWarning({ result, dismissed, onDismiss }) {
  if (!result || dismissed) return null
  if (result.severity === 'info' || !result.headline) return null

  return (
    <div
      className={`intent-warning intent-warning--${result.severity}`}
      role="status"
      aria-live="polite"
    >
      <div className="intent-warning__head">
        <span className="intent-warning__badge">
          {SEVERITY_LABELS[result.severity] || 'Note'}
        </span>
        <button
          type="button"
          className="intent-warning__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss warning"
          title="Dismiss"
        >
          ✕
        </button>
      </div>
      <p className="intent-warning__headline">{result.headline}</p>
      {result.advice && (
        <p className="intent-warning__advice">{result.advice}</p>
      )}
      <p className="intent-warning__source">
        Vertex AI · classified from anonymized stats — your message was not sent
      </p>
    </div>
  )
}
