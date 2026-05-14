'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './FulfilmentClient.module.css'

type Order = {
  id: string
  status: string
  itemName: string
  itemPrice: number
  shippingCost: number
  dropName: string
  buyerName: string
  buyerEmail: string
  recipientName: string
  recipientEmail: string
  address: { line1: string; line2?: string; city: string; state?: string; postcode: string; country: string }
  trackingNumber?: string
  createdAt: string
}

export default function FulfilmentClient({ orders }: { orders: Order[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'PENDING' | 'SHIPPED' | 'ALL'>('PENDING')
  const [trackingInputs, setTrackingInputs] = useState<Record<string, string>>({})
  const [shipping, setShipping] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<Record<string, string>>({})

  const filtered = orders.filter(o =>
    filter === 'ALL' ? true : o.status === filter
  )

  async function markShipped(orderId: string) {
    const tracking = trackingInputs[orderId]?.trim()
    if (!tracking) { setError(prev => ({ ...prev, [orderId]: 'Please enter a tracking number.' })); return }
    setShipping(prev => ({ ...prev, [orderId]: true }))
    setError(prev => ({ ...prev, [orderId]: '' }))
    try {
      const res = await fetch('/api/orders/fulfilment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, trackingNumber: tracking }),
      })
      const data = await res.json()
      if (!res.ok) { setError(prev => ({ ...prev, [orderId]: data.error })); return }
      router.refresh()
    } catch {
      setError(prev => ({ ...prev, [orderId]: 'Something went wrong.' }))
    } finally {
      setShipping(prev => ({ ...prev, [orderId]: false }))
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>Fulfilment</h1>
        <p className={styles.sub}>Items buyers have chosen to receive. Enter a tracking number to notify them by email.</p>
      </div>

      <div className={styles.tabs}>
        {(['PENDING', 'SHIPPED', 'ALL'] as const).map(f => (
          <button key={f} className={`${styles.tab} ${filter === f ? styles.tabActive : ''}`} onClick={() => setFilter(f)}>
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}><div className={styles.emptyIcon}>📦</div><p>No {filter.toLowerCase()} orders.</p></div>
      ) : filtered.map(o => {
        const addr = o.address
        const addrStr = [o.recipientName, addr.line1, addr.line2, addr.city + (addr.state ? ', ' + addr.state : ''), addr.postcode, addr.country].filter(Boolean).join('\n')
        return (
          <div key={o.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.itemName}>{o.itemName}</div>
                <div className={styles.dropName}>{o.dropName}</div>
                <div className={styles.meta}>
                  <span className={`${styles.statusBadge} ${o.status === 'SHIPPED' ? styles.statusShipped : styles.statusPending}`}>
                    {o.status.toLowerCase()}
                  </span>
                  <span className={styles.date}>{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className={styles.cardRight}>
                <div className={styles.price}>${o.itemPrice.toFixed(2)}</div>
                <div className={styles.shipCost}>+ ${o.shippingCost.toFixed(2)} ship</div>
                <div className={styles.buyerEmail}>✉️ {o.recipientEmail}</div>
              </div>
            </div>

            <div className={styles.addrBlock}>
              <div className={styles.addrLabel}>Ship to</div>
              <div className={styles.addr}>{addrStr.split('\n').map((line, i) => <span key={i}>{line}<br /></span>)}</div>
            </div>

            {o.status === 'PENDING' ? (
              <div className={styles.trackRow}>
                <input
                  placeholder="Enter tracking number"
                  value={trackingInputs[o.id] ?? ''}
                  onChange={e => setTrackingInputs(prev => ({ ...prev, [o.id]: e.target.value }))}
                  style={{ flex: 1, fontSize: '0.8rem' }}
                />
                <button
                  className={styles.shipBtn}
                  onClick={() => markShipped(o.id)}
                  disabled={shipping[o.id]}
                >
                  {shipping[o.id] ? <span className="spin" /> : 'Mark Shipped'}
                </button>
              </div>
            ) : (
              <div className={styles.trackingDone}>🚚 {o.trackingNumber}</div>
            )}
            {error[o.id] && <div className={styles.errMsg}>{error[o.id]}</div>}
          </div>
        )
      })}
    </div>
  )
}
