'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from '../auth.module.css'

export default function SignUpPage() {
  const router = useRouter()
  const [role, setRole] = useState<'BUYER' | 'STORE_OWNER'>('BUYER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, company: role === 'STORE_OWNER' ? company : undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      router.push('/dashboard')
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
        <div className={styles.logo}>
          <span className={styles.logoMark}>York<em>stores</em></span>
        </div>
        <h1 className={styles.title}>Create account</h1>

        <div className={styles.rolePicker}>
          <button type="button" className={`${styles.roleCard} ${role === 'BUYER' ? styles.roleCardActive : ''}`} onClick={() => setRole('BUYER')}>
            <span className={styles.roleIcon}>🛍️</span>
            <span className={styles.roleName}>Buy</span>
            <span className={styles.roleDesc}>Open mystery boxes and choose delivery or sell back</span>
          </button>
          <button type="button" className={`${styles.roleCard} ${role === 'STORE_OWNER' ? styles.roleCardActive : ''}`} onClick={() => setRole('STORE_OWNER')}>
            <span className={styles.roleIcon}>🏪</span>
            <span className={styles.roleName}>Sell</span>
            <span className={styles.roleDesc}>Create drops and ship items to buyers</span>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className={styles.errorBox}>{error}</div>}
          <div className="field">
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required autoComplete="name" />
          </div>
          {role === 'STORE_OWNER' && (
            <div className="field">
              <label htmlFor="company">Company Name</label>
              <input id="company" type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Sneaker Vault Co." required={role === 'STORE_OWNER'} />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="password">Password <span style={{color:'var(--text3)',fontWeight:400,textTransform:'none',letterSpacing:0}}>— at least 8 characters</span></label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete="new-password" />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? <span className="spin" /> : 'Create account'}
          </button>
        </form>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link href="/signin" className={styles.footerLink}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}
