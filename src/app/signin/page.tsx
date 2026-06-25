'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../auth.module.css'

function YorkieLogo() {
  return (
    <div className={styles.logoWrap}>
      <svg className={styles.logoDog} viewBox="0 0 40 44" fill="#FF6B85" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <ellipse cx="20" cy="30" rx="13" ry="9"/>
        <ellipse cx="30" cy="16" rx="8" ry="7"/>
        <ellipse cx="37" cy="19" rx="4" ry="3"/>
        <ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)"/>
        <ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)"/>
        <path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23"/>
        <rect x="26" y="36" width="4" height="8" rx="2"/>
        <rect x="20" y="36" width="4" height="8" rx="2"/>
        <rect x="13" y="36" width="4" height="8" rx="2"/>
        <rect x="7" y="35" width="4" height="8" rx="2"/>
        <circle cx="35" cy="15" r="1.2" fill="#0F0F14"/>
        <ellipse cx="40" cy="20" rx="1.5" ry="1" fill="#0F0F14"/>
      </svg>
      <div className={styles.logoWordmark}>York<em>stores</em></div>
      <div className={styles.logoTagline}>Shop. Play. Win.</div>
    </div>
  )
}

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      const sp = new URLSearchParams(window.location.search)
      const dest = sp.get('next') || sp.get('redirect')
      router.push(dest && dest.startsWith('/') ? dest : '/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <YorkieLogo />
        {error && <div className={styles.errorBox}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
          </div>
          <div className={styles.forgotRow}>
            <Link href="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className="spin" /> : 'Sign in'}
          </button>
        </form>
        <p className={styles.footer}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className={styles.footerLink}>Sign up</Link>
        </p>
      </div>
    </div>
  )
}