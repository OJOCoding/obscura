import TerminalBox from '../components/TerminalBox.jsx'

export default function Privacy() {
  return (
    <main className="page">
      <div className="page__inner">
        <p className="compose__tagline">Privacy policy</p>

        <TerminalBox title="What we can never see">
          <div className="modal__section">
            <p className="modal__section-title">Your message content</p>
            <p className="modal__section-text">
              Plaintext is encrypted in your browser before anything is transmitted.
              The server only receives and stores ciphertext.
            </p>
          </div>
          <div className="modal__section">
            <p className="modal__section-title">Your encryption key</p>
            <p className="modal__section-text">
              The AES key is embedded in the URL fragment. Browsers do not transmit
              fragments over HTTP. Even full server logs and database access cannot
              reconstruct it.
            </p>
          </div>
          <div className="modal__section">
            <p className="modal__section-title">Who read the message</p>
            <p className="modal__section-text">
              No accounts, no cookies, no session tracking. The server cannot link
              a drop to a sender or a reader.
            </p>
          </div>
        </TerminalBox>

        <div className="mt-24">
          <TerminalBox title="What we do store (temporarily)">
            <div className="modal__section">
              <p className="modal__section-title">Ciphertext</p>
              <p className="modal__section-text">
                Kept in Redis with your chosen TTL (5 min – 7 days). Deleted
                atomically the moment the drop is read, or when the TTL expires.
              </p>
            </div>
            <div className="modal__section">
              <p className="modal__section-title">Rate-limit counters</p>
              <p className="modal__section-text">
                Per-IP request counts, hashed with a rotating daily HMAC secret so
                the raw IP cannot be recovered. Expire after 60 seconds.
              </p>
            </div>
            <div className="modal__section">
              <p className="modal__section-title">Aggregate platform counters</p>
              <p className="modal__section-text">
                Hourly totals of drops created and drops read, not tied to any user.
                Used only to detect platform-wide anomalies.
              </p>
            </div>
          </TerminalBox>
        </div>

        <div className="mt-24">
          <TerminalBox title="Risks we cannot eliminate">
            <div className="modal__section">
              <p className="modal__section-text">
                Your <strong>browser history</strong> records the full share URL
                including the key. Use private/incognito mode when generating drops.
              </p>
            </div>
            <div className="modal__section">
              <p className="modal__section-text">
                <strong>Chat apps</strong> that auto-preview links may fetch the URL
                and burn the drop before the intended recipient sees it.
              </p>
            </div>
            <div className="modal__section">
              <p className="modal__section-text">
                Network observers can see that <em>some</em> encrypted message
                passed through, even if not its contents. For maximum privacy
                use Obscura over Tor or a VPN.
              </p>
            </div>
          </TerminalBox>
        </div>
      </div>
    </main>
  )
}
