'use client'
import { useState } from 'react'
import Link from 'next/link'
import styles from '../auth.module.css'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setSent(true)
    setLoading(false)
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}><span className={styles.logoMark}>York<em>stores</em></span></div>
        <h1 className={styles.title}>Reset password</h1>
        <p className={styles.sub}>We'll send a reset link to your email if an account exists.</p>
        {sent ? (
          <div className={styles.successBox}>
            Check your inbox — if that email is registered, a reset link is on its way.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <span className="spin" /> : 'Send reset link'}
            </button>
          </form>
        )}
        <p className={styles.footer}><Link href="/signin" className={styles.footerLink}>Back to sign in</Link></p>
      </div>
    </div>
  )
}
