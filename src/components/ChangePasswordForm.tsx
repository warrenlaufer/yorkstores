'use client'
import { useState } from 'react'

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    if (next.length < 8) { setMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return }
    if (next !== confirm) { setMsg({ ok: false, text: 'New passwords do not match.' }); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, password: next }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ ok: false, text: data.error || 'Something went wrong.' }); return }
      setMsg({ ok: true, text: 'Password updated successfully.' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch {
      setMsg({ ok: false, text: 'Something went wrong. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="current">Current password</label>
        <input id="current" type="password" value={current} onChange={e => setCurrent(e.target.value)} autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor="next">New password</label>
        <input id="next" type="password" value={next} onChange={e => setNext(e.target.value)} autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm new password</label>
        <input id="confirm" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="new-password" minLength={8} required />
      </div>

      {msg && (
        <p style={{ fontSize: 'var(--fs-sm)', margin: '0 0 var(--sp-4)', color: msg.ok ? 'var(--green)' : '#FF8FA3' }}>{msg.text}</p>
      )}

      <button type="submit" className="btn btn-primary" disabled={loading || !current || !next || !confirm}>
        {loading ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}
