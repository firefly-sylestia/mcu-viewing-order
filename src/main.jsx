import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import '@fontsource-variable/geom/wght.css'
import './index.css'
import App from './App.jsx'
import { motionCssVars } from './constants/motion'

const AppRuntime = () => <App />

Object.entries(motionCssVars).forEach(([key, value]) => {
  document.documentElement.style.setProperty(key, value)
})

// Apply persisted appearance before the first paint. Without this the light
// palette (and the fresh interface) only kick in after Settings mounts, which
// left the detail view and other overlays rendering with dark colours.
const readStored = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}
const storedTheme = readStored('theme', 'dark')
document.documentElement.setAttribute('data-theme', storedTheme)
document.documentElement.classList.toggle('dark', storedTheme !== 'light')
document.documentElement.setAttribute('data-ui', readStored('ui-variant', 'fresh'))

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unknown error' }
  }

  componentDidCatch(error, info) {
    console.error('App render error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100svh',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            background: '#090d1f',
            color: '#f4f7ff',
            fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
            textAlign: 'center',
          }}
        >
          <div>
            <h1 style={{ marginBottom: 8, fontSize: 20 }}>App failed to load</h1>
            <p style={{ opacity: 0.8, fontSize: 14, margin: 0 }}>{this.state.message}</p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppErrorBoundary>
      <AppRuntime />
      <Analytics />
      <SpeedInsights />
    </AppErrorBoundary>
  </StrictMode>,
)
