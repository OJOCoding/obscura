import { useEffect, useState } from 'react'

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'

function scramble(text, progress) {
  return text
    .split('')
    .map((char, i) => {
      if (char === ' ') return ' '
      if (i / text.length < progress) return char
      return CHARS[Math.floor(Math.random() * CHARS.length)]
    })
    .join('')
}

export default function BurnAnimation({ onComplete }) {
  const [progress, setProgress] = useState(0)
  const [display, setDisplay] = useState('TRANSMISSION DESTROYED')

  useEffect(() => {
    const target = 'TRANSMISSION DESTROYED'
    let frame = 0
    const total = 40

    const id = setInterval(() => {
      frame++
      const p = frame / total
      setProgress(p)
      setDisplay(scramble(target, p))
      if (frame >= total) {
        clearInterval(id)
        setDisplay(target)
        onComplete?.()
      }
    }, 50)

    return () => clearInterval(id)
  }, [])

  return (
    <div className="burn-animation">
      <div className="burn-animation__icon">◉</div>
      <div className="burn-animation__title">{display}</div>
      <p className="burn-animation__sub">
        This message has been permanently deleted from all servers.
        It cannot be recovered.
      </p>
    </div>
  )
}
