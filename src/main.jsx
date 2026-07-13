import { Component, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { useLenis } from './hooks/useLenis'
import { motionCssVars } from './constants/motion'

const AppRuntime = () => {
  useLenis()

  return <App />
}

Object.entries(motionCssVars).forEach(([key, value]) => {
  document.documentElement.style.setProperty(key, value)
})

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
    </AppErrorBoundary>
  </StrictMode>,
)
