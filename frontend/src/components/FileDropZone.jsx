import { useRef, useState, useCallback } from 'react'

/**
 * FileDropZone — click-or-drop file picker.
 *
 * Calls onAdd(File[]) with newly selected files. Parent owns the selection
 * state and is responsible for size/count validation.
 */
export default function FileDropZone({ onAdd, disabled }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFiles = useCallback((fileList) => {
    if (!fileList || fileList.length === 0) return
    onAdd(Array.from(fileList))
  }, [onAdd])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }, [disabled, handleFiles])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleChange = (e) => {
    handleFiles(e.target.files)
    // Reset so selecting the same file twice still fires onChange
    e.target.value = ''
  }

  return (
    <div
      className={`file-dropzone ${dragOver ? 'file-dropzone--over' : ''} ${disabled ? 'file-dropzone--disabled' : ''}`}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={handleChange}
        disabled={disabled}
      />
      <div className="file-dropzone__icon" aria-hidden="true">＋</div>
      <div className="file-dropzone__text">
        <strong>Attach files</strong>
        <span>Click or drop — encrypted before upload</span>
      </div>
    </div>
  )
}
