'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const AMOUNTS = [25, 50, 100, 250, 500, 1000]

function WalletContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [balance, setBalance] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMsg, setPromoMsg] = useState('')
  const [promoErr, setPromoErr] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutErr, setCheckoutErr] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    if (params.get('success') === '1') {
      setSuccessMsg('🎉 Payment successful! Your wallet has been topped up.')
      router.replace('/dashboard/wallet')
    }
    if (params.get('cancelled') === '1') {
      setCheckoutErr('Payment cancelled.')
      router.replace('/dashboard/wallet')
    }
  }, [params])

  useEffect(() => {
    fetch('/api/users/me').then(r => r.json()).then(d => {
      if (d.ok) setBalance(Number(d.data.walletBalance))
    }).catch(() => {})
  }, [])

  const effectiveAmount = custom ? parseFloat(custom) : selected

  async function handleCheckout() {
    if (!effectiveAmount || effectiveAmount < 1) { setCheckoutErr('Enter a valid amount (min $1).'); return }
    if (effectiveAmount > 10000) { setCheckoutErr('Maximum top-up is $10,000.'); return }
    setCheckoutLoading(true); setCheckoutErr('')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(effectiveAmount * 100) }),
      })
      const data = await res.json()
      if (!res.ok) { setCheckoutErr(data.error); return }
      window.location.href = data.data.url
    } catch { setCheckoutErr('Something went wrong.') }
    finally { setCheckoutLoading(false) }
  }

  async function redeemPromo() {
    if (!promoCode.trim()) return
    setPromoLoading(true); setPromoMsg(''); setPromoErr('')
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoCode.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setPromoErr(data.error); return }
      setPromoMsg(`✅ $${data.data.amount.toFixed(2)} added to your wallet!`)
      setPromoCode('')
      setBalance(prev => prev !== null ? prev + data.data.amount : null)
    } catch { setPromoErr('Something went wrong.') }
    finally { setPromoLoading(false) }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
      <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>Wallet</h1>
      <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '1.5rem' }}>Add funds to open drops.</p>

      {/* Balance */}
      <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: '0.4rem' }}>Current Balance</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--mono)', color: '#3DD68C' }}>
          {balance !== null ? `$${balance.toFixed(2)}` : '—'}
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.3)', color: '#5FFFA8', fontSize: '0.78rem', padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {/* Top-up */}
      <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FF8FA3', marginBottom: '0.85rem' }}>Top Up</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setSelected(a); setCustom('') }}
              style={{
                background: selected === a && !custom ? 'rgba(255,107,133,0.15)' : '#1D1D26',
                border: `1px solid ${selected === a && !custom ? '#FF6B85' : 'rgba(255,255,255,0.1)'}`,
                color: selected === a && !custom ? '#FF8FA3' : '#fff',
                borderRadius: 8, padding: '0.6rem', fontFamily: 'var(--font)',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              ${a}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Custom Amount</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>$</span>
            <input
              type="number"
              value={custom}
              onChange={e => { setCustom(e.target.value); setSelected(null) }}
              placeholder="Enter amount"
              min="1"
              max="10000"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        {checkoutErr && (
          <div style={{ background: 'rgba(255,107,133,0.12)', border: '1px solid rgba(255,107,133,0.3)', color: '#FF8FA3', fontSize: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 8, marginBottom: '0.75rem' }}>
            {checkoutErr}
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={checkoutLoading || !effectiveAmount}
          style={{
            width: '100%', background: effectiveAmount ? '#FF6B85' : '#2a2a35',
            color: effectiveAmount ? '#fff' : 'rgba(255,255,255,0.3)',
            border: 'none', borderRadius: 10, fontFamily: 'var(--font)',
            fontWeight: 800, fontSize: '0.9rem', padding: '0.7rem',
            cursor: effectiveAmount ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'background 0.15s',
          }}
        >
          {checkoutLoading
            ? <span className="spin" />
            : effectiveAmount
              ? `Pay $${Number(effectiveAmount).toFixed(2)} with Stripe`
              : 'Select an amount'}
        </button>
        <p style={{ fontSize: '0.65rem', color: 'var(--text3)', textAlign: 'center', marginTop: '0.5rem' }}>
          Secured by Stripe · Visa, Mastercard, Amex accepted
        </p>
      </div>

      {/* Promo code */}
      <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FF8FA3', marginBottom: '0.85rem' }}>Promo Code</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <input
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMsg(''); setPromoErr('') }}
            onKeyDown={e => e.key === 'Enter' && redeemPromo()}
            placeholder="Enter promo code…"
            style={{ flex: 1 }}
          />
          <button
            onClick={redeemPromo}
            disabled={promoLoading || !promoCode.trim()}
            style={{
              background: '#FF6B85', color: '#fff', border: 'none', borderRadius: 8,
              fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 800,
              padding: '0 1rem', cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: promoLoading || !promoCode.trim() ? 0.5 : 1,
            }}
          >
            {promoLoading ? <span className="spin" style={{ width: 14, height: 14 }} /> : 'Redeem'}
          </button>
        </div>
        {promoErr && <p style={{ fontSize: '0.72rem', color: '#FF8FA3', margin: 0 }}>{promoErr}</p>}
        {promoMsg && <p style={{ fontSize: '0.72rem', color: '#5FFFA8', margin: 0 }}>{promoMsg}</p>}
      </div>
    </div>
  )
}

export default function WalletPage() {
  return <Suspense><WalletContent /></Suspense>
}