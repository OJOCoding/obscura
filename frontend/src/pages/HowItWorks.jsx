import TerminalBox from '../components/TerminalBox.jsx'

export default function HowItWorks() {
  return (
    <main className="page">
      <div className="page__inner">
        <p className="compose__tagline">How Obscura works</p>

        <TerminalBox title="Zero-knowledge protocol">
          <div className="modal__section">
            <p className="modal__section-title">1. You type a message</p>
            <p className="modal__section-text">
              In your browser. No keystrokes are sent anywhere — everything stays local
              until you click create.
            </p>
          </div>
          <div className="modal__section">
            <p className="modal__section-title">2. Browser generates an AES-256 key</p>
            <p className="modal__section-text">
              Your browser uses the Web Crypto API to generate a fresh 256-bit key
              and a random 96-bit IV. The key exists only in your browser's memory.
            </p>
          </div>
          <div className="modal__section">
            <p className="modal__section-title">3. Message is encrypted locally</p>
            <p className="modal__section-text">
              AES-GCM encrypts your plaintext. Only the ciphertext blob is sent
              to the server — never the plaintext.
            </p>
          </div>
          <div className="modal__section">
            <p className="modal__section-title">4. Server stores ciphertext only</p>
            <p className="modal__section-text">
              The server assigns a random ID and stores the encrypted blob in Redis
              with a TTL. It has no way to decrypt it.
            </p>
          </div>
          <div className="modal__section">
            <p className="modal__section-title">5. Key lives in the URL fragment</p>
            <p className="modal__section-text">
              The share link looks like <code>/drop/&#123;id&#125;#&#123;key&#125;</code>.
              Browsers never transmit <code>#fragment</code> portions over HTTP — so the
              server can never see your key.
            </p>
          </div>
          <div className="modal__section">
            <p className="modal__section-title">6. Recipient decrypts in-browser</p>
            <p className="modal__section-text">
              Opening the link fetches the ciphertext, atomically deletes it from
              the server (burn-after-read), and decrypts locally using the key from
              the fragment. Second read: nothing to retrieve — permanently gone.
            </p>
          </div>
        </TerminalBox>
      </div>
    </main>
  )
}
