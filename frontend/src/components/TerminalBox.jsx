export default function TerminalBox({ title, children, className = '' }) {
  return (
    <div className={`terminal-box ${className}`}>
      {title && (
        <div className="terminal-box__header">
          <span className="terminal-box__dot terminal-box__dot--green" />
          <span className="terminal-box__dot terminal-box__dot--amber" />
          <span className="terminal-box__dot terminal-box__dot--red" />
          <span style={{ marginLeft: 8 }}>{title}</span>
        </div>
      )}
      {children}
    </div>
  )
}
