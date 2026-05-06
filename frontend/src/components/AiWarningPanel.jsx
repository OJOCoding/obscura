import { useState } from 'react'

function WarningCard({ warning, index }) {
  // Heuristic severity from position (first warnings are higher-risk per prompt design)
  const severity = index === 0 ? 'high' : index === 1 ? 'medium' : 'low'
  return (
    <div className={`warning-card warning-card--${severity}`}>
      <span className={`warning-card__badge warning-card__badge--${severity}`}>
        {severity}
      </span>
      <p className="warning-card__text">{warning}</p>
    </div>
  )
}

export default function AiWarningPanel({ warnings, riskLevel, loading }) {
  const [open, setOpen] = useState(true)

  const riskColor = {
    low: 'var(--ice)',
    medium: 'var(--amber)',
    high: 'var(--red)',
  }[riskLevel] || 'var(--steel)'

  return (
    <div className="ai-panel mt-24">
      <div className="ai-panel__header" onClick={() => setOpen(o => !o)} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setOpen(o => !o)}>
        <span className="ai-panel__title">Privacy Intelligence</span>
        <span className="ai-panel__score" style={{ color: riskColor }}>
          {loading ? '...' : `Risk: ${(riskLevel || 'low').toUpperCase()}`}
          &nbsp;{open ? '▲' : '▼'}
        </span>
      </div>

      {open && (
        <div className="ai-panel__body">
          {loading && (
            <p className="ai-panel__loading">Analyzing metadata patterns...</p>
          )}
          {!loading && (!warnings || warnings.length === 0) && (
            <p className="ai-panel__empty">
              No metadata anomalies detected. Your usage patterns appear normal.
            </p>
          )}
          {!loading && warnings && warnings.map((w, i) => (
            <WarningCard key={i} warning={w} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}
