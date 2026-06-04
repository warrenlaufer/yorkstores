'use client'
import { useState } from 'react'
import styles from './admin.module.css'

type W = {
  id: string
  source: string
  amount: number
  status: string
  createdAt: string
  user: { name: string; email: string; role: string; company: string | null }
}

export default function WithdrawalsClient({ initial }: { initial: W[] }) {
  const [items, setItems] = useState(initial)
  const [busy, setBusy] = useState<string | null>(null)

  async function act(id: string, action: 'approve' | 'reject') {
    setBusy(id)
    try {
      const res = await fetch('/api/admin/withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      const data = await res.json()
      if (res.ok) setItems(prev => prev.map(w => (w.id === id ? { ...w, status: data.data.status } : w)))
      else alert(data.error)
    } catch {
      alert('Action failed — please try again')
    } finally {
      setBusy(null)
    }
  }

  const color = (s: string) => (s === 'PAID' ? '#3DD68C' : s === 'REJECTED' ? '#FF8FA3' : '#F5C842')

  return (
    <div className={styles.table}>
      <div className={styles.tableHead}>
        <span>User</span><span>Type</span><span>Amount</span><span>Status</span><span>Requested</span><span>Action</span>
      </div>
      {items.map(w => (
        <div key={w.id} className={styles.tableRow}>
          <span>{w.user.name}<span className={styles.cellMuted}> · {w.user.email}</span></span>
          <span><span className={styles.roleBadge}>{w.source}</span></span>
          <span style={{ fontFamily: 'var(--mono)' }}>${w.amount.toFixed(2)}</span>
          <span style={{ color: color(w.status), fontWeight: 700, fontSize: '0.7rem' }}>{w.status}</span>
          <span className={styles.cellMuted}>{new Date(w.createdAt).toLocaleDateString()}</span>
          <span>
            {w.status === 'PENDING' ? (
              <span style={{ display: 'flex', gap: 6 }}>
                <button disabled={busy === w.id} onClick={() => act(w.id, 'approve')}
                  style={{ background: '#3DD68C', color: '#0F0F14', border: 'none', borderRadius: 5, fontFamily: 'var(--font)', fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>
                  Mark Paid
                </button>
                <button disabled={busy === w.id} onClick={() => act(w.id, 'reject')}
                  style={{ background: 'transparent', color: '#FF8FA3', border: '1px solid rgba(255,107,133,0.3)', borderRadius: 5, fontFamily: 'var(--font)', fontSize: '0.65rem', fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>
                  Reject
                </button>
              </span>
            ) : <span className={styles.cellMuted}>—</span>}
          </span>
        </div>
      ))}
      {items.length === 0 && (
        <div className={styles.tableRow}><span className={styles.cellMuted} style={{ gridColumn: '1/-1' }}>No withdrawals yet.</span></div>
      )}
    </div>
  )
}
