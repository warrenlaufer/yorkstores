'use client'
import { useState } from 'react'
import styles from './admin.module.css'

type PromoCode = {
  id: string
  code: string
  type: string
  amount: number
  matchPct: number
  description: string | null
  maxUses: number | null
  usedCount: number
  isActive: boolean
  createdAt: string
}

export default function PromoClient({ initial }: { initial: PromoCode[] }) {
  const [codes, setCodes] = useState<PromoCode[]>(initial)
  const [code, setCode] = useState('')
  const [type, setType] = useState<'fixed' | 'match'>('fixed')
  const [amount, setAmount] = useState('')
  const [matchPct, setMatchPct] = useState('100')
  const [description, setDescription] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function create() {
    if (!code || !amount) { setError('Code and amount are required.'); return }
    setCreating(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/admin/promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          type,
          amount: parseFloat(amount),
          matchPct: type === 'match' ? parseInt(matchPct || '100') : undefined,
          description: description || undefined,
          maxUses: maxUses ? parseInt(maxUses) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setCodes(prev => [{ ...data.data, amount: Number(data.data.amount), matchPct: Number(data.data.matchPct ?? 100), usedCount: 0, isActive: true, createdAt: new Date().toISOString() }, ...prev])
      setCode(''); setAmount(''); setMatchPct('100'); setType('fixed'); setDescription(''); setMaxUses('')
      setSuccess('Promo code created.')
      setTimeout(() => setSuccess(''), 2500)
    } catch { setError('Something went wrong.') }
    finally { setCreating(false) }
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch('/api/admin/promo', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setCodes(prev => prev.map(c => c.id === id ? { ...c, isActive: !isActive } : c))
    }
  }

  return (
    <div>
      {/* Create form */}
      <div style={{ background:'#0F0F14', border:'1px solid rgba(255,255,255,0.09)', borderRadius:12, padding:'1rem', marginBottom:'1rem' }}>
        <div style={{ fontSize:'0.62rem', fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'#FF8FA3', marginBottom:'0.85rem' }}>Create Promo Code</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 130px 120px', gap:'0.5rem', marginBottom:'0.5rem' }}>
          <div><label>Code</label><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="WELCOME300" /></div>
          <div><label>Type</label>
            <select value={type} onChange={e => setType(e.target.value as 'fixed' | 'match')} style={{ width:'100%' }}>
              <option value="fixed">Fixed credit</option>
              <option value="match">Deposit match</option>
            </select>
          </div>
          <div><label>{type === 'match' ? 'Max match $' : 'Amount $'}</label><input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="0.01" /></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: type === 'match' ? '110px 1fr 80px' : '1fr 80px', gap:'0.5rem', marginBottom:'0.5rem' }}>
          {type === 'match' && <div><label>Match %</label><input type="number" value={matchPct} onChange={e => setMatchPct(e.target.value)} min="1" placeholder="100" /></div>}
          <div><label>Description</label><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" /></div>
          <div><label>Max Uses</label><input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder="∞" min="1" /></div>
        </div>
        {type === 'match' && <p style={{ fontSize:'0.62rem', color:'var(--text3)', margin:'0 0 0.5rem' }}>Match codes grant promo credit = deposit × match%, capped at the max match amount. Entered by buyers on the Top Up screen.</p>}
        {error && <div style={{ background:'rgba(255,107,133,0.12)', border:'1px solid rgba(255,107,133,0.3)', color:'#FF8FA3', fontSize:'0.75rem', padding:'0.5rem 0.75rem', borderRadius:8, marginBottom:'0.5rem' }}>{error}</div>}
        {success && <div style={{ background:'rgba(61,214,140,0.12)', border:'1px solid rgba(61,214,140,0.3)', color:'#5FFFA8', fontSize:'0.75rem', padding:'0.5rem 0.75rem', borderRadius:8, marginBottom:'0.5rem' }}>{success}</div>}
        <button
          onClick={create}
          disabled={creating}
          style={{ background:'#FF6B85', color:'#fff', border:'none', borderRadius:8, fontFamily:'var(--font)', fontSize:'0.78rem', fontWeight:800, padding:'0.5rem 1.25rem', cursor:'pointer' }}
        >
          {creating ? 'Creating…' : '+ Create Code'}
        </button>
      </div>

      {/* Codes table */}
      <div className={styles.table}>
        <div style={{ display:'grid', gridTemplateColumns:'140px 80px 1fr 80px 60px 80px', gap:8, padding:'0.5rem 1rem', background:'rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.08)', fontSize:'0.6rem', fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--text3)' }}>
          <span>Code</span><span>Amount</span><span>Description</span><span>Uses</span><span>Active</span><span>Action</span>
        </div>
        {codes.length === 0 && (
          <div style={{ padding:'1.5rem', textAlign:'center', color:'var(--text2)', fontSize:'0.78rem' }}>No promo codes yet.</div>
        )}
        {codes.map(c => (
          <div key={c.id} style={{ display:'grid', gridTemplateColumns:'140px 80px 1fr 80px 60px 80px', gap:8, padding:'0.65rem 1rem', borderBottom:'1px solid rgba(255,255,255,0.05)', alignItems:'center', fontSize:'0.78rem' }}>
            <span style={{ fontFamily:'var(--mono)', fontWeight:700, color:'#F5C842' }}>{c.code}</span>
            <span style={{ fontFamily:'var(--mono)', color:'#3DD68C', fontSize: c.type === 'match' ? '0.66rem' : '0.78rem' }}>{c.type === 'match' ? `match ${c.matchPct}% · max $${Number(c.amount).toFixed(2)}` : `$${Number(c.amount).toFixed(2)}`}</span>
            <span style={{ color:'var(--text2)', fontSize:'0.72rem' }}>{c.description || '—'}</span>
            <span style={{ color:'var(--text2)', fontSize:'0.72rem' }}>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ''}</span>
            <span>
              <span style={{ fontSize:'0.65rem', fontWeight:700, padding:'2px 7px', borderRadius:4, background: c.isActive ? 'rgba(61,214,140,0.15)' : 'rgba(255,255,255,0.06)', color: c.isActive ? '#3DD68C' : 'var(--text3)', border: `1px solid ${c.isActive ? 'rgba(61,214,140,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                {c.isActive ? 'On' : 'Off'}
              </span>
            </span>
            <span>
              <button
                onClick={() => toggleActive(c.id, c.isActive)}
                style={{ background:'transparent', color: c.isActive ? '#FF8FA3' : '#5FFFA8', border:`1px solid ${c.isActive ? 'rgba(255,107,133,0.3)' : 'rgba(61,214,140,0.3)'}`, borderRadius:5, fontFamily:'var(--font)', fontSize:'0.65rem', fontWeight:700, padding:'3px 8px', cursor:'pointer' }}
              >
                {c.isActive ? 'Disable' : 'Enable'}
              </button>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}