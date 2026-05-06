/**
 * AiResponseBox — terminal-styled card that shows the actual response from
 * the Gemini metadata-leak analyst for a given drop.
 *
 * Always rendered on the receive page (when AI ran) so the feature is
 * visible even on "boring" drops with zero warnings.
 */

const RISK_LABEL = {
  low:    'LOW',
  medium: 'MEDIUM',
  high:   'HIGH',
}

const RISK_DESCRIPTION = {
  low:    'No metadata-leakage patterns detected.',
  medium: 'Worth noting — patterns exist but are not high-risk.',
  high:   'Clear metadata-leakage risk in the session statistics.',
}

export default function AiResponseBox({ analyzed, warnings = [], riskLevel = 'low' }) {
  if (!analyzed) {
    return (
      <div className="ai-response">
        <div className="ai-response__head">
          <span className="ai-response__title">Gemini metadata analysis</span>
          <span className="ai-response__pill ai-response__pill--off">disabled</span>
        </div>
        <p className="ai-response__body-text">
          AI analysis was not configured for this drop (no GEMINI_API_KEY on the server).
        </p>
      </div>
    )
  }

  const risk = RISK_LABEL[riskLevel] || 'LOW'
  const desc = RISK_DESCRIPTION[riskLevel] || RISK_DESCRIPTION.low
  const json = JSON.stringify(
    { warnings, risk_level: riskLevel },
    null,
    2,
  )

  return (
    <div className={`ai-response ai-response--${riskLevel}`}>
      <div className="ai-response__head">
        <span className="ai-response__title">Gemini metadata analysis</span>
        <span className={`ai-response__pill ai-response__pill--${riskLevel}`}>
          risk: {risk}
        </span>
      </div>

      <p className="ai-response__body-text">{desc}</p>

      {warnings.length > 0 && (
        <ul className="ai-response__warnings">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <details className="ai-response__raw">
        <summary>Raw model response</summary>
        <pre>{json}</pre>
      </details>

      <p className="ai-response__footnote">
        Anonymized session stats only — Gemini never saw the message itself.
      </p>
    </div>
  )
}
