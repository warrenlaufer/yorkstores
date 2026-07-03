'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Banknote, Gift } from 'lucide-react'
import { Suspense } from 'react'

const AMOUNTS = [25, 50, 100, 250, 500, 1000]

function WalletContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [cashBalance, setCashBalance] = useState<number | null>(null)
  const [promoBalance, setPromoBalance] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [custom, setCustom] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoMsg, setPromoMsg] = useState('')
  const [promoErr, setPromoErr] = useState('')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutErr, setCheckoutErr] = useState('')
  const [matchCode, setMatchCode] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [wdAmount, setWdAmount] = useState('')
  const [payoutsEnabled, setPayoutsEnabled] = useState<boolean | null>(null)
  const [connectLoading, setConnectLoading] = useState(false)
  const [wdLoading, setWdLoading] = useState(false)
  const [wdMsg, setWdMsg] = useState('')
  const [wdErr, setWdErr] = useState('')
  const [wdConfirm, setWdConfirm] = useState(false)

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
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.ok) {
        setCashBalance(Number(d.data.cashBalance ?? d.data.walletBalance))
        setPromoBalance(Number(d.data.promoBalance ?? 0))
        setPayoutsEnabled(!!d.data.payoutsEnabled)
      }
    }).catch(() => {})
  }, [])

  const effectiveAmount = custom ? parseFloat(custom) : selected
  const totalBalance = (cashBalance ?? 0) + (promoBalance ?? 0)

  async function handleCheckout() {
    if (!effectiveAmount || effectiveAmount < 1) { setCheckoutErr('Enter a valid amount (min $1).'); return }
    if (effectiveAmount > 10000) { setCheckoutErr('Maximum top-up is $10,000.'); return }
    setCheckoutLoading(true); setCheckoutErr('')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(effectiveAmount * 100), promoCode: matchCode.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setCheckoutErr(data.error); return }
      window.location.href = data.data.url
    } catch { setCheckoutErr('Something went wrong.') }
    finally { setCheckoutLoading(false) }
  }

  async function startConnect() {
    setConnectLoading(true)
    try {
      const res = await fetch('/api/connect/onboard', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.data?.url) window.location.href = data.data.url
      else { setWdErr(data.error || 'Could not start payout setup.'); setConnectLoading(false) }
    } catch { setWdErr('Something went wrong.'); setConnectLoading(false) }
  }

  function handleWithdraw() {
    const amt = parseFloat(wdAmount)
    if (!amt || amt < 10) { setWdErr('Minimum withdrawal is $10.'); return }
    if (cashBalance !== null && amt > cashBalance) { setWdErr('Amount exceeds your withdrawable cash balance.'); return }
    setWdErr('')
    // If there's promo credit to forfeit, require an explicit confirmation first.
    if ((promoBalance ?? 0) > 0 && !wdConfirm) { setWdConfirm(true); return }
    doWithdraw(amt)
  }

  async function doWithdraw(amt: number) {
    setWdLoading(true); setWdMsg(''); setWdErr('')
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, source: 'buyer' }),
      })
      const data = await res.json()
      if (!res.ok) { setWdErr(data.error); return }
      setWdMsg(`✅ Withdrawal of $${amt.toFixed(2)} requested. You'll be paid out after admin review.`)
      setWdAmount('')
      setCashBalance(prev => (prev ?? 0) - amt)
      setPromoBalance(0)
      setWdConfirm(false)
    } catch { setWdErr('Something went wrong.') }
    finally { setWdLoading(false) }
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
      setPromoMsg(`✅ $${data.data.amount.toFixed(2)} promo credit added!`)
      setPromoCode('')
      setPromoBalance(prev => (prev ?? 0) + data.data.amount)
    } catch { setPromoErr('Something went wrong.') }
    finally { setPromoLoading(false) }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '1.5rem 1.25rem 3rem' }}>
      <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', marginBottom: '0.2rem' }}>Wallet</h1>
      <p style={{ fontSize: '0.78rem', color: 'var(--text2)', marginBottom: '1.5rem' }}>Add funds to open drops.</p>

      {/* Balance breakdown */}
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text2)', marginBottom: '0.4rem' }}>Total Balance</div>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--green)' }}>
            {cashBalance !== null ? `$${totalBalance.toFixed(2)}` : '—'}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '1rem' }}>
          <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '0.3rem' }}><Banknote size={11} style={{verticalAlign:'-2px',marginRight:3}} />Cash</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--green)' }}>
              {cashBalance !== null ? `$${cashBalance.toFixed(2)}` : '—'}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text3)', marginTop: '0.3rem' }}>Withdrawable</div>
          </div>
          <div style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: '0.3rem' }}><Gift size={11} style={{verticalAlign:'-2px',marginRight:3}} />Promo</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 900, fontFamily: 'var(--mono)', color: 'var(--gold)' }}>
              {promoBalance !== null ? `$${promoBalance.toFixed(2)}` : '—'}
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text3)', marginTop: '0.3rem' }}>Non-withdrawable</div>
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.3)', color: '#5FFFA8', fontSize: '0.78rem', padding: '0.6rem 0.85rem', borderRadius: 8, marginBottom: '1rem' }}>
          {successMsg}
        </div>
      )}

      {/* Top-up */}
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FF8FA3', marginBottom: '0.85rem' }}>Top Up Cash Balance</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
          {AMOUNTS.map(a => (
            <button
              key={a}
              onClick={() => { setSelected(a); setCustom('') }}
              style={{
                background: selected === a && !custom ? 'rgba(255,107,133,0.15)' : 'var(--surface-2)',
                border: `1px solid ${selected === a && !custom ? 'var(--accent)' : 'rgba(255,255,255,0.1)'}`,
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

        <div style={{ marginBottom: '0.75rem' }}>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Match Code (optional)</label>
          <input
            type="text"
            value={matchCode}
            onChange={e => { setMatchCode(e.target.value.toUpperCase()); setCheckoutErr('') }}
            placeholder="Get bonus promo credit on your deposit"
            style={{ width: '100%', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}
          />
          <p style={{ fontSize: '0.6rem', color: 'var(--text3)', margin: '0.3rem 0 0' }}>Match codes add bonus promo credit equal to your deposit (up to the code's cap). Promo credit isn't withdrawable.</p>
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
            width: '100%', background: effectiveAmount ? 'var(--accent)' : '#2a2a35',
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
          Secured by Stripe · Visa, Mastercard, Amex accepted · Added to cash balance
        </p>
      </div>

      {/* Withdraw */}
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: '0.5rem' }}>Withdraw Cash</div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text3)', marginBottom: '0.75rem' }}>Withdraw from your cash balance (promo credit can't be withdrawn). Minimum $10. Paid to your bank via Stripe after admin review.</p>
        {payoutsEnabled === false ? (
          <div>
            <p style={{ fontSize: '0.7rem', color: 'var(--text2)', marginBottom: '0.6rem' }}>Set up payouts with Stripe to withdraw. You'll add your bank details on Stripe's secure page.</p>
            <button onClick={startConnect} disabled={connectLoading}
              style={{ background: '#635BFF', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 800, padding: '0.5rem 1rem', cursor: 'pointer' }}>
              {connectLoading ? 'Starting…' : 'Set up payouts'}
            </button>
            {wdErr && <p style={{ fontSize: '0.72rem', color: '#FF8FA3', margin: '0.5rem 0 0' }}>{wdErr}</p>}
          </div>
        ) : (
        <>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1 }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>$</span>
            <input
              type="number"
              value={wdAmount}
              onChange={e => { setWdAmount(e.target.value); setWdMsg(''); setWdErr('') }}
              placeholder="Amount"
              min="10"
              style={{ flex: 1 }}
            />
          </div>
          <button
            onClick={handleWithdraw}
            disabled={wdLoading || !wdAmount}
            style={{
              background: 'var(--green)', color: 'var(--bg2)', border: 'none', borderRadius: 8,
              fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 800,
              padding: '0 1rem', cursor: 'pointer', whiteSpace: 'nowrap',
              opacity: wdLoading || !wdAmount ? 0.5 : 1,
            }}
          >
            {wdLoading ? <span className="spin" style={{ width: 14, height: 14 }} /> : 'Withdraw'}
          </button>
        </div>
        {wdConfirm && (
          <div style={{ background: 'rgba(255,107,133,0.08)', border: '1px solid rgba(255,107,133,0.3)', borderRadius: 8, padding: '0.6rem 0.75rem', margin: '0 0 0.5rem' }}>
            <p style={{ fontSize: '0.72rem', color: '#FF8FA3', fontWeight: 700, margin: '0 0 0.4rem' }}>⚠️ Withdrawing forfeits all your promo credit{promoBalance ? ` ($${promoBalance.toFixed(2)})` : ''}.</p>
            <p style={{ fontSize: '0.66rem', color: 'var(--text2)', margin: '0 0 0.6rem' }}>This can't be undone — your promo balance will drop to $0.</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { const a = parseFloat(wdAmount); if (a) doWithdraw(a) }} disabled={wdLoading}
                style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontFamily: 'var(--font)', fontSize: '0.72rem', fontWeight: 800, padding: '0.4rem 0.9rem', cursor: 'pointer' }}>
                {wdLoading ? 'Submitting…' : 'Forfeit promo & withdraw'}
              </button>
              <button onClick={() => setWdConfirm(false)} disabled={wdLoading}
                style={{ background: 'transparent', color: 'var(--text2)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 7, fontFamily: 'var(--font)', fontSize: '0.72rem', fontWeight: 700, padding: '0.4rem 0.9rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {wdErr && <p style={{ fontSize: '0.72rem', color: '#FF8FA3', margin: 0 }}>{wdErr}</p>}
        {wdMsg && <p style={{ fontSize: '0.72rem', color: '#5FFFA8', margin: 0 }}>{wdMsg}</p>}
        </>
        )}
      </div>

      {/* Promo code */}
      <div style={{ background: 'var(--bg2)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem' }}>
        <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#FF8FA3', marginBottom: '0.5rem' }}>Promo Code</div>
        <p style={{ fontSize: '0.65rem', color: 'var(--text3)', marginBottom: '0.75rem' }}>Promo credits are added to your promo balance and cannot be withdrawn.</p>
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
              background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8,
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