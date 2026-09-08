import { ArrowLeft, Home, Search } from 'lucide-react'

export default function NotFoundPage({ onHome }) {
  return (
    <main className="not-found-page">
      <div className="not-found-card">
        <p className="eyebrow">ARCHIVE SIGNAL LOST</p>
        <h1>That timeline does not exist</h1>
        <p>We could not find the page you requested. Return to the viewing order and keep exploring.</p>
        <div className="not-found-actions">
          <button type="button" onClick={onHome}><Home size={16} aria-hidden="true" /> Back to home</button>
          <button type="button" className="secondary" onClick={() => { window.location.hash = 'list' }}><Search size={16} aria-hidden="true" /> Browse titles</button>
        </div>
        <button type="button" className="not-found-back" onClick={() => window.history.back()}><ArrowLeft size={15} aria-hidden="true" /> Go back</button>
      </div>
    </main>
  )
}
