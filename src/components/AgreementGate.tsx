'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AgreementGate({ needsSeller }: { needsSeller: boolean }) {
  const router = useRouter()
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function accept() {
    if (!agreed) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/agreements/accept', { method: 'POST' })
      if (res.ok) { router.refresh() }
      else { const d = await res.json(); setError(d.error || 'Something went wrong.'); setLoading(false) }
    } catch { setError('Something went wrong.'); setLoading(false) }
  }

  const link = { color: '#FF8FA3', textDecoration: 'underline' as const }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: '#16161E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, maxWidth: 460, width: '100%', padding: '1.6rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', margin: '0 0 0.5rem' }}>Please review our agreements</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text2)', lineHeight: 1.6, margin: '0 0 1rem' }}>
          We&rsquo;ve updated our agreements. To keep using Yorkstores, please read and accept them.
        </p>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--text)', marginBottom: '1rem' }}>
          <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
            style={{ appearance: 'auto', width: 16, height: 16, minWidth: 16, padding: 0, margin: '2px 0 0', background: 'transparent', border: 'none', borderRadius: 0, flexShrink: 0, accentColor: '#FF6B85' }} />
          <span>
            I have read and agree to the{' '}
            <a href="/legal/terms" target="_blank" style={link}>Terms of Service</a>{' '}and{' '}
            <a href="/legal/privacy" target="_blank" style={link}>Privacy Policy</a>
            {needsSeller && <>{', '}and the{' '}<a href="/legal/seller-agreement" target="_blank" style={link}>Seller Agreement</a></>}.
          </span>
        </label>
        {error && <p style={{ fontSize: '0.78rem', color: '#FF8FA3', margin: '0 0 0.75rem' }}>{error}</p>}
        <button onClick={accept} disabled={!agreed || loading}
          style={{ width: '100%', background: '#FF6B85', color: '#fff', border: 'none', borderRadius: 9, fontFamily: 'var(--font)', fontSize: '0.9rem', fontWeight: 800, padding: '0.7rem', cursor: agreed && !loading ? 'pointer' : 'not-allowed', opacity: agreed && !loading ? 1 : 0.55 }}>
          {loading ? 'Saving…' : 'Agree and continue'}
        </button>
      </div>
    </div>
  )
}
