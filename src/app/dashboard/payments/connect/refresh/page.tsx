'use client'
import { useState } from 'react'

export default function ConnectRefreshPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function restart() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.data?.url) {
        window.location.href = data.data.url
      } else {
        setError(data.error || 'Could not restart payout setup.')
        setLoading(false)
      }
    } catch {
      setError('Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔄</div>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>Resume payout setup</h1>
      <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        Your setup link expired or was interrupted. Click below to pick up where you left off.
      </p>
      {error && <p style={{ color: '#FF8FA3', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>}
      <button onClick={restart} disabled={loading}
        style={{ background: '#FF6B85', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font)', fontWeight: 800, fontSize: '0.85rem', padding: '0.6rem 1.4rem', cursor: 'pointer' }}>
        {loading ? 'Starting…' : 'Continue setup'}
      </button>
    </div>
  )
}
