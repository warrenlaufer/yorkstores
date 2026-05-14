'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../auth.module.css'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error); return }
    setDone(true)
    setTimeout(() => router.push('/signin'), 2500)
  }

  if (!token) return <p style={{color:'var(--text2)',fontSize:'0.85rem'}}>Invalid reset link.</p>

  return done ? (
    <div className={styles.successBox}>Password updated! Redirecting to sign in…</div>
  ) : (
    <form onSubmit={handleSubmit}>
      {error && <div className={styles.errorBox}>{error}</div>}
      <div className="field">
        <label htmlFor="password">New Password <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>— at least 8 characters</span></label>
        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete="new-password" />
      </div>
      <button type="submit" className={styles.submitBtn} disabled={loading}>
        {loading ? <span className="spin" /> : 'Set new password'}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}><span className={styles.logoMark}>York<em>stores</em></span></div>
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.sub} style={{marginBottom:'1.25rem'}}>Choose something strong.</p>
        <Suspense><ResetForm /></Suspense>
        <p className={styles.footer}><Link href="/signin" className={styles.footerLink}>Back to sign in</Link></p>
      </div>
    </div>
  )
}
