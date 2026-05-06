import { formatBytes } from '../lib/envelope.js'

/**
 * FileChip — compact display of a single attached file.
 *
 * Two modes:
 *   - "compose": shows a remove button (calls onRemove)
 *   - "receive": shows a download button (calls onDownload)
 */
export default function FileChip({ file, mode, onRemove, onDownload }) {
  const name = file.name || 'unnamed'
  const size = typeof file.size === 'number' ? formatBytes(file.size) : ''

  return (
    <div className="file-chip">
      <div className="file-chip__icon" aria-hidden="true">▤</div>
      <div className="file-chip__meta">
        <div className="file-chip__name" title={name}>{name}</div>
        <div className="file-chip__size">{size}</div>
      </div>
      {mode === 'compose' && (
        <button
          type="button"
          className="file-chip__action"
          onClick={onRemove}
          aria-label={`Remove ${name}`}
          title="Remove"
        >
          ✕
        </button>
      )}
      {mode === 'receive' && (
        <button
          type="button"
          className="file-chip__action file-chip__action--primary"
          onClick={onDownload}
          aria-label={`Download ${name}`}
          title="Download"
        >
          ↓
        </button>
      )}
    </div>
  )
}
