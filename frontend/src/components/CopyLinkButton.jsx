import { useState } from 'react'

export default function CopyLinkButton({ url }) {
  const [state, setState] = useState('idle') // idle | copied

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    } catch {
      // Fallback for browsers that deny clipboard without gesture
      const el = document.createElement('textarea')
      el.value = url
      el.style.position = 'fixed'
      el.style.opacity = '0'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    }
  }

  return (
    <div className="link-display">
      <div className="link-display__url">
        <span className="link-display__url-text" title={url}>{url}</span>
        <button
          className={`copy-btn ${state === 'copied' ? 'copy-btn--copied' : ''}`}
          onClick={handleCopy}
        >
          {state === 'copied' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="link-display__warning">
        Share this link privately — preferably via a channel different from
        the one you are protecting. Once you leave this page the link cannot
        be recovered. Chat apps may preview the link and trigger the burn.
      </div>
    </div>
  )
}
