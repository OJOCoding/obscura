import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Compose from './pages/Compose.jsx'
import Receive from './pages/Receive.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import Privacy from './pages/Privacy.jsx'
import Docs from './pages/Docs.jsx'
import NotFound from './pages/NotFound.jsx'
import ThemeToggle from './components/ThemeToggle.jsx'

function SiteHeader() {
  return (
    <header className="site-header">
      <Link to="/" className="site-header__logo">
        <img src="/obscura-logo.svg" alt="Obscura logo" />
        <span className="site-header__wordmark">Obscura</span>
      </Link>
      <nav className="site-header__nav">
        <Link to="/how-it-works">How it works</Link>
        <Link to="/privacy">Privacy</Link>
        <Link to="/docs">Docs</Link>
        <ThemeToggle />
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteHeader />
      <Routes>
        <Route path="/" element={<Compose />} />
        <Route path="/drop/:dropId" element={<Receive />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/docs" element={<Docs />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
