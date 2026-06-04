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

export default function SignUpPage() {
  const router = useRouter()
  const [role, setRole] = useState<'BUYER' | 'STORE_OWNER'>('BUYER')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [step, setStep] = useState<'role' | 'invite' | 'form'>('role')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)

  function handleRoleContinue() {
    if (role === 'STORE_OWNER') {
      setStep('invite')
    } else {
      setStep('form')
    }
  }

  async function checkInvite() {
    if (!inviteCode.trim()) { setError('Please enter your invite code.'); return }
    setVerifying(true)
    setError('')
    try {
      const res = await fetch('/api/auth/verify-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid invite code.'); return }
      setStep('form')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, company: role === 'STORE_OWNER' ? company : undefined, inviteCode: role === 'STORE_OWNER' ? inviteCode.trim() : undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
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
        <YorkieLogo />

        {step === 'role' && (
          <div>
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
            <button type="button" className={styles.submitBtn} onClick={handleRoleContinue}>Continue</button>
            <p className={styles.footer}>
              Already have an account?{' '}
              <Link href="/signin" className={styles.footerLink}>Sign in</Link>
            </p>
          </div>
        )}

        {step === 'invite' && (
          <div>
            <div style={{background:'rgba(255,107,133,0.06)',border:'1px solid rgba(255,107,133,0.2)',borderRadius:12,padding:'1rem',marginBottom:'1.25rem',textAlign:'center'}}>
              <div style={{fontSize:'1.4rem',marginBottom:'0.4rem'}}>🔒</div>
              <div style={{fontSize:'0.88rem',fontWeight:800,color:'#fff',marginBottom:'0.3rem'}}>Seller invite required</div>
              <div style={{fontSize:'0.72rem',color:'#9898B0',lineHeight:1.5}}>Seller accounts are by invitation only.</div>
            </div>
            {error && <div className={styles.errorBox}>{error}</div>}
            <div className="field">
              <label>Invite Code</label>
              <input
                type="text"
                value={inviteCode}
                onChange={e => { setInviteCode(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { checkInvite() } }}
                style={{textAlign:'center',fontFamily:'var(--mono)',fontSize:'1rem',fontWeight:700,letterSpacing:'0.1em'}}
              />
            </div>
            <button type="button" className={styles.submitBtn} onClick={checkInvite} disabled={verifying}>{verifying ? <span className="spin" /> : 'Verify Code'}</button>
            <p className={styles.footer}>
              <button type="button" onClick={() => { setStep('role'); setError('') }} style={{background:'none',border:'none',color:'#FF8FA3',cursor:'pointer',fontFamily:'inherit',fontSize:'0.8rem',fontWeight:700,textDecoration:'underline'}}>← Back</button>
            </p>
          </div>
        )}

        {step === 'form' && (
          <div>
            {role === 'STORE_OWNER' && (
              <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(61,214,140,0.1)',border:'1px solid rgba(61,214,140,0.25)',borderRadius:9,padding:'0.5rem 0.75rem',marginBottom:'1rem'}}>
                <span>✅</span>
                <span style={{fontSize:'0.72rem',color:'#5FFFA8',fontWeight:700}}>Invite code verified — seller account</span>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              {error && <div className={styles.errorBox}>{error}</div>}
              <div className="field">
                <label htmlFor="name">Full Name</label>
                <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} required autoComplete="name" />
              </div>
              {role === 'STORE_OWNER' && (
                <div className="field">
                  <label htmlFor="company">Company Name</label>
                  <input id="company" type="text" value={company} onChange={e => setCompany(e.target.value)} required />
                </div>
              )}
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div className="field">
                <label htmlFor="password">Password</label>
                <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <span className="spin" /> : 'Create account'}
              </button>
            </form>
            <p className={styles.footer}>
              <button type="button" onClick={() => { setStep('role'); setError('') }} style={{background:'none',border:'none',color:'#FF8FA3',cursor:'pointer',fontFamily:'inherit',fontSize:'0.8rem',fontWeight:700,textDecoration:'underline'}}>← Back</button>
            </p>
          </div>
        )}

      </div>
    </div>
  )
}