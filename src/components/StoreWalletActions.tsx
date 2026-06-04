'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PRESETS = [100, 250, 500, 1000]

export default function StoreWalletActions({ storeBalance, availableBalance }: { storeBalance: number; availableBalance: number }) {
  const router = useRouter()
  const [available, setAvailable] = useState(availableBalance)
  const [topupAmt, setTopupAmt] = useState('')
  const [topupLoading, setTopupLoading] = useState(false)
  const [topupErr, setTopupErr] = useState('')

  const [wdAmount, setWdAmount] = useState('')
  const [wdLoading, setWdLoading] = useState(false)
  const [wdMsg, setWdMsg] = useState('')
  const [wdErr, setWdErr] = useState('')

  async function handleTopup() {
    const amt = parseFloat(topupAmt)
    if (!amt || amt < 1) { setTopupErr('Enter a valid amount (min $1).'); return }
    if (amt > 100000) { setTopupErr('Maximum top-up is $100,000.'); return }
    setTopupLoading(true); setTopupErr('')
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Math.round(amt * 100), target: 'store' }),
      })
      const data = await res.json()
      if (!res.ok) { setTopupErr(data.error); return }
      window.location.href = data.data.url
    } catch { setTopupErr('Something went wrong.') }
    finally { setTopupLoading(false) }
  }

  async function handleWithdraw() {
    const amt = parseFloat(wdAmount)
    if (!amt || amt < 10) { setWdErr('Minimum withdrawal is $10.'); return }
    if (amt > available) { setWdErr('Amount exceeds your available balance.'); return }
    setWdLoading(true); setWdMsg(''); setWdErr('')
    try {
      const res = await fetch('/api/withdrawals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, source: 'store' }),
      })
      const data = await res.json()
      if (!res.ok) { setWdErr(data.error); return }
      setWdMsg(`✅ Withdrawal of $${amt.toFixed(2)} requested. Paid out after admin review.`)
      setWdAmount('')
      setAvailable(a => Math.round((a - amt) * 100) / 100)
      router.refresh()
    } catch { setWdErr('Something went wrong.') }
    finally { setWdLoading(false) }
  }

  const card: React.CSSProperties = { background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, padding: '1rem' }
  const label: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }
  const sub: React.CSSProperties = { fontSize: '0.65rem', color: 'var(--text3)', marginBottom: '0.75rem' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem', marginBottom: '1.25rem' }}>
      {/* Top up */}
      <div style={card}>
        <div style={{ ...label, color: '#FF8FA3' }}>Add Funds</div>
        <p style={sub}>Top up your store balance to cover buybacks and lift a suspension.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
          {PRESETS.map(a => (
            <button key={a} onClick={() => setTopupAmt(String(a))}
              style={{ background: topupAmt === String(a) ? 'rgba(255,107,133,0.15)' : '#1D1D26', border: `1px solid ${topupAmt === String(a) ? '#FF6B85' : 'rgba(255,255,255,0.1)'}`, color: topupAmt === String(a) ? '#FF8FA3' : '#fff', borderRadius: 8, padding: '0.45rem 0.7rem', fontFamily: 'var(--font)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              ${a}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1 }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>$</span>
            <input type="number" value={topupAmt} onChange={e => { setTopupAmt(e.target.value); setTopupErr('') }} placeholder="Amount" min="1" style={{ flex: 1 }} />
          </div>
          <button onClick={handleTopup} disabled={topupLoading || !topupAmt}
            style={{ background: '#FF6B85', color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 800, padding: '0 1rem', cursor: 'pointer', whiteSpace: 'nowrap', opacity: topupLoading || !topupAmt ? 0.5 : 1 }}>
            {topupLoading ? <span className="spin" style={{ width: 14, height: 14 }} /> : 'Top Up'}
          </button>
        </div>
        {topupErr && <p style={{ fontSize: '0.72rem', color: '#FF8FA3', margin: '0.5rem 0 0' }}>{topupErr}</p>}
      </div>

      {/* Withdraw */}
      <div style={card}>
        <div style={{ ...label, color: '#3DD68C' }}>Withdraw</div>
        <p style={sub}>Available to withdraw: <strong style={{ color: '#3DD68C' }}>${available.toFixed(2)}</strong>. Reserved buyback funds and negative balances can't be withdrawn. Minimum $10.</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1 }}>
            <span style={{ color: 'var(--text2)', fontSize: '0.85rem' }}>$</span>
            <input type="number" value={wdAmount} onChange={e => { setWdAmount(e.target.value); setWdMsg(''); setWdErr('') }} placeholder="Amount" min="10" style={{ flex: 1 }} />
          </div>
          <button onClick={handleWithdraw} disabled={wdLoading || !wdAmount}
            style={{ background: '#3DD68C', color: '#0F0F14', border: 'none', borderRadius: 8, fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 800, padding: '0 1rem', cursor: 'pointer', whiteSpace: 'nowrap', opacity: wdLoading || !wdAmount ? 0.5 : 1 }}>
            {wdLoading ? <span className="spin" style={{ width: 14, height: 14 }} /> : 'Withdraw'}
          </button>
        </div>
        {wdErr && <p style={{ fontSize: '0.72rem', color: '#FF8FA3', margin: '0.5rem 0 0' }}>{wdErr}</p>}
        {wdMsg && <p style={{ fontSize: '0.72rem', color: '#5FFFA8', margin: '0.5rem 0 0' }}>{wdMsg}</p>}
      </div>
    </div>
  )
}
