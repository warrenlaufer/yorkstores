'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './DropDetailClient.module.css'

type Box = { id: string; itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl?: string; sold: boolean }
type Drop = { id: string; name: string; emoji: string; logoUrl?: string; owner: string; boxPrice: number; boxes: Box[] }
type User = { id: string; name: string; email: string; role: string; walletBalance: number }

export default function DropDetailClient({ drop, user }: { drop: Drop; user: User }) {
  const router = useRouter()
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState('')

  const available = drop.boxes.filter(b => !b.sold).length

  const itemMap: Record<string, { name: string; price: number; count: number }> = {}
  drop.boxes.forEach(b => {
    const k = `${b.itemName}|${b.itemPrice}`
    if (!itemMap[k]) itemMap[k] = { name: b.itemName, price: b.itemPrice, count: 0 }
    itemMap[k].count++
  })

  async function pickBox(boxId: string) {
    if (buying) return
    setError('')
    setBuying(boxId)
    try {
      const res = await fetch(`/api/drops/${drop.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxId }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setBuying(null); return }
      router.push(`/dashboard/reveal?purchaseId=${data.data.purchaseId}&dropId=${drop.id}`)
    } catch {
      setError('Something went wrong.')
      setBuying(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <Link href="/dashboard" className={styles.back}>← Back to Drops</Link>

      <div className={styles.header}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          {drop.logoUrl ? (
            <img src={drop.logoUrl} alt={drop.name} style={{width:48,height:48,objectFit:'contain',borderRadius:8,background:'#1D1D26',padding:4}} />
          ) : (
            <span style={{fontSize:'2rem'}}>{drop.emoji || '📦'}</span>
          )}
          <div>
            <h1 className={styles.title}>{drop.name}</h1>
            <p className={styles.sub}>{available} of {drop.boxes.length} available · by {drop.owner}</p>
          </div>
        </div>
        <div className={styles.priceTag}>
          <div className={styles.priceVal}>${drop.boxPrice}</div>
          <div className={styles.priceLbl}>per box</div>
        </div>
      </div>

      {error && <div className={styles.errBox}>{error}</div>}

      <div className={styles.section}>Possible items &amp; odds</div>
      <div className={styles.oddsTable}>
        <div className={styles.oddsHead}>
          <span></span><span>Item</span><span>Value</span><span>Odds</span>
        </div>
        {Object.values(itemMap).map((it, i) => {
          const pct = Math.round(it.count / drop.boxes.length * 100)
          return (
            <div key={i} className={styles.oddsRow}>
              <span>📦</span>
              <span className={styles.oddsName}>{it.name}{it.count > 1 ? ` ×${it.count}` : ''}</span>
              <span className={styles.oddsPrice}>${it.price}</span>
              <span className={styles.oddsPct}>{pct}%</span>
            </div>
          )
        })}
      </div>

      <div className={styles.section}>{drop.boxes.length} boxes — click one to open</div>
      <div className={styles.boxGrid}>
        {drop.boxes.map((b, i) => (
          <button
            key={b.id}
            className={`${styles.boxTile} ${b.sold ? styles.boxSold : ''}`}
            disabled={b.sold || !!buying}
            onClick={() => !b.sold && pickBox(b.id)}
          >
            {buying === b.id ? <span className="spin" style={{ width: 20, height: 20 }} /> : (
              <>
                <span className={styles.boxEmoji}>{drop.emoji || '📦'}</span>
                <span className={styles.boxNum}>#{String(i + 1).padStart(2, '0')}</span>
                {!b.sold && <div className={styles.shimmer} />}
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}