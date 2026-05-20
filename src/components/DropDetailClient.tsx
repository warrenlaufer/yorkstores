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

  const available = drop.boxes.filter(b => !b.sold)

  const itemMap: Record<string, { name: string; price: number; count: number; imageUrl?: string }> = {}
  drop.boxes.forEach(b => {
    const k = `${b.itemName}|${b.itemPrice}`
    if (!itemMap[k]) itemMap[k] = { name: b.itemName, price: b.itemPrice, count: 0, imageUrl: b.itemImageUrl }
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

  async function chooseForMe() {
    if (buying || available.length === 0) return
    const random = available[Math.floor(Math.random() * available.length)]
    await pickBox(random.id)
  }

  return (
    <div className={styles.wrap}>
      <Link href="/dashboard" className={styles.back}>← Back to Drops</Link>

      {drop.logoUrl && (
        <div className={styles.logoBanner}>
          <img src={drop.logoUrl} alt={drop.name} className={styles.logoBannerImg} />
        </div>
      )}

      <div className={styles.header}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          {!drop.logoUrl && (
            <span style={{fontSize:'2rem'}}>{drop.emoji || '📦'}</span>
          )}
          <div>
            <h1 className={styles.title}>{drop.name}</h1>
            <p className={styles.sub}>{available.length} of {drop.boxes.length} available · by {drop.owner}</p>
          </div>
        </div>
        <div className={styles.priceGroup}>
          <div className={styles.priceTag}>
            <div className={styles.priceVal}>${drop.boxPrice}</div>
            <div className={styles.priceLbl}>per box</div>
          </div>
          <button
            className={styles.chooseForMeBtn}
            onClick={chooseForMe}
            disabled={!!buying || available.length === 0}
          >
            {buying ? <span className="spin" style={{width:14,height:14}} /> : '🎲 Choose For Me'}
          </button>
        </div>
      </div>

      {error && <div className={styles.errBox}>{error}</div>}

      <div className={styles.sectionRow}>
        <span className={styles.section}>Possible items &amp; odds</span>
      </div>

      <div className={styles.itemGrid}>
        {Object.values(itemMap).map((it, i) => {
          const pct = Math.round(it.count / drop.boxes.length * 100)
          return (
            <div key={i} className={styles.itemCard}>
              <div className={styles.itemImageWrap}>
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.name} className={styles.itemImage} />
                ) : (
                  <span className={styles.itemEmoji}>📦</span>
                )}
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{it.name}</div>
                <div className={styles.itemMeta}>
                  <span className={styles.itemPrice}>${it.price}</span>
                  <span className={styles.itemPct}>{pct}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.sectionRow} style={{marginTop:'1.5rem'}}>
        <span className={styles.section}>{drop.boxes.length} boxes — click one to open</span>
      </div>

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