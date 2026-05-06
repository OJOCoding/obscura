export default function NotFound() {
  return (
    <main className="page">
      <div className="page__inner">
        <div className="signal-lost">
          <div style={{ fontSize: 48, opacity: 0.4 }}>◉</div>
          <h1 className="signal-lost__title">404</h1>
          <p className="signal-lost__sub">
            This route does not exist.
          </p>
          <p className="signal-lost__link">
            <a href="/">Return to Obscura</a>
          </p>
        </div>
      </div>
    </main>
  )
}
