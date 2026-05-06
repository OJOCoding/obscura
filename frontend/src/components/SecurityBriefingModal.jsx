const SESSION_KEY = 'obscura_briefed'

export function needsBriefing() {
  try {
    return !sessionStorage.getItem(SESSION_KEY)
  } catch {
    return false
  }
}

export function markBriefed() {
  try {
    sessionStorage.setItem(SESSION_KEY, '1')
  } catch {}
}

export default function SecurityBriefingModal({ onConfirm }) {
  function handleConfirm() {
    markBriefed()
    onConfirm()
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="briefing-title">
      <div className="modal">
        <h2 className="modal__title" id="briefing-title">Security Briefing</h2>

        <div className="modal__section">
          <p className="modal__section-title">Zero-knowledge encryption</p>
          <p className="modal__section-text">
            Your message is encrypted in your browser using AES-256. The server
            never sees your plaintext or your encryption key — only random-looking
            ciphertext.
          </p>
        </div>

        <div className="modal__section">
          <p className="modal__section-title">Key in URL fragment</p>
          <p className="modal__section-text">
            The decryption key is embedded in the <code>#fragment</code> of the
            share link. Browsers never transmit fragments to servers, so your key
            stays client-side. However, your <strong>browser history</strong> and
            any <strong>chat app link preview</strong> may expose the full URL —
            including the key.
          </p>
        </div>

        <div className="modal__section">
          <p className="modal__section-title">Burn after one read</p>
          <p className="modal__section-text">
            As soon as the recipient opens the link, the server permanently deletes
            the ciphertext. The message cannot be retrieved a second time — by
            anyone.
          </p>
        </div>

        <div className="modal__section">
          <p className="modal__section-title">Share wisely</p>
          <p className="modal__section-text">
            Send the link via a different channel than the conversation you are
            protecting. Do not paste it into an app that generates link previews.
          </p>
        </div>

        <button className="modal__confirm" onClick={handleConfirm}>
          I understand — let me create a drop
        </button>
      </div>
    </div>
  )
}
