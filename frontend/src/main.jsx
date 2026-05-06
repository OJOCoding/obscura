import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Note: StrictMode is disabled because it double-invokes effects in dev,
// which would burn each dead drop immediately on mount. Production is unaffected.
ReactDOM.createRoot(document.getElementById('root')).render(<App />)
