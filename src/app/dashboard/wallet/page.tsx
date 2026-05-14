'use client'
import { useState } from 'react'
import styles from './wallet.module.css'

const PRESETS = [10, 25, 50, 100]

export default function WalletPage() {
  const [amount, setAmount] = useState(25)
  const [customAmt, setCustomAmt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'pick' | 'paying' | 'done'>('pick')

  const finalAmount = customAmt ? parseFloat(customAmt) : amount

  async function startPayment() {
    if (!finalAmount || finalAmount < 1) { setError('Minimum top-up is $1.'); return }
    if (finalAmount > 10000) { setError('Maximum top-up is $10,000.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/users/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalAmount }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }

      // In production: load Stripe.js and mount PaymentElement
      // const stripe = await loadStripe(data.data.publishableKey)
      // const elements = stripe.elements({ clientSecret: data.data.clientSecret })
      // For now, simulate completion:
      setStep('paying')
      setTimeout(() => setStep('done'), 2000)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'done') return (
    <div className={styles.wrap}>
      <div className={styles.successCard}>
        <div className={styles.successIcon}>✅</div>
        <h2 className={styles.successTitle}>Payment successful!</h2>
        <p className={styles.successSub}>${finalAmount.toFixed(2)} has been added to your wallet.</p>
        <a href="/dashboard" className={styles.doneBtn}>Back to Drops</a>
      </div>
    </div>
  )

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>Add Funds</h1>
        <p className={styles.sub}>Funds are added to your wallet instantly after payment.</p>

        <div className={styles.presets}>
          {PRESETS.map(p => (
            <button
              key={p}
              className={`${styles.preset} ${amount === p && !customAmt ? styles.presetActive : ''}`}
              onClick={() => { setAmount(p); setCustomAmt('') }}
            >
              ${p}
            </button>
          ))}
        </div>

        <div className={styles.customRow}>
          <span className={styles.dollarSign}>$</span>
          <input
            type="number"
            placeholder="Custom amount"
            min="1"
            max="10000"
            value={customAmt}
            onChange={e => setCustomAmt(e.target.value)}
            className={styles.customInput}
          />
        </div>

        {error && <div className={styles.errBox}>{error}</div>}

        <div className={styles.divider}><span>Pay with</span></div>

        <button className={styles.applePayBtn} onClick={startPayment} disabled={loading || step === 'paying'}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.42c1.42.07 2.38.74 3.2.8 1.22-.24 2.38-.93 3.7-.84 1.57.12 2.76.72 3.53 1.84-3.24 1.94-2.7 6.03.7 7.27-.56 1.34-1.28 2.65-3.13 3.79zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
          Pay with Apple Pay
        </button>

        <button className={styles.cardBtn} onClick={startPayment} disabled={loading || step === 'paying'}>
          {step === 'paying' ? <span className="spin" /> : `Add $${finalAmount.toFixed(2)} by card`}
        </button>

        <p className={styles.stripe}>
          <svg width="36" height="14" viewBox="0 0 60 25"><text x="0" y="18" fontFamily="Arial" fontSize="15" fontWeight="bold" fill="rgba(255,255,255,0.3)">stripe</text></svg>
          Secured by Stripe
        </p>
      </div>
    </div>
  )
}
