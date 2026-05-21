'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import styles from './DropDetailClient.module.css'

type Box = { id: string; itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl?: string; sold: boolean }
type Drop = { id: string; name: string; emoji: string; logoUrl?: string; owner: string; boxPrice: number; sellBackPct: number; boxes: Box[] }
type User = { id: string; name: string; email: string; role: string; walletBalance: number }

export default function DropDetailClient({ drop, user }: { drop: Drop; user: User }) {
  const router = useRouter()
  const [buying, setBuying] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState('')
  const [confirmBoxId, setConfirmBoxId] = useState<string | null>(null)
  const [confirmRandom, setConfirmRandom] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)

  const available = drop.boxes.filter(b => !b.sold)

  const itemMap: Record<string, { name: string; price: number; count: number; imageUrl?: string }> = {}
  drop.boxes.forEach(b => {
    const k = `${b.itemName}|${b.itemPrice}`
    if (!itemMap[k]) itemMap[k] = { name: b.itemName, price: b.itemPrice, count: 0, imageUrl: b.itemImageUrl }
    itemMap[k].count++
  })
  const sortedItems = Object.values(itemMap).sort((a, b) => b.price - a.price)

  async function confirmPurchase() {
    if (!confirmBoxId) return
    const boxToOpen = confirmBoxId
    setError('')
    setBuying(boxToOpen)
    setConfirmBoxId(null)
    setConfirmRandom(false)
    setPurchasing(true)
    try {
      const res = await fetch(`/api/drops/${drop.id}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxId: boxToOpen }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setBuying(null); setPurchasing(false); return }
      router.push(`/dashboard/reveal?purchaseId=${data.data.purchaseId}&dropId=${drop.id}`)
    } catch {
      setError('Something went wrong.')
      setBuying(null)
      setPurchasing(false)
    }
  }

  function handleBoxClick(boxId: string) {
    if (buying) return
    setConfirmBoxId(boxId)
    setConfirmRandom(false)
  }

  function handleChooseForMe() {
    if (buying || available.length === 0) return
    const random = available[Math.floor(Math.random() * available.length)]
    setConfirmBoxId(random.id)
    setConfirmRandom(true)
  }

  function cancelConfirm() {
    setConfirmBoxId(null)
    setConfirmRandom(false)
  }

  return (
    <div className={styles.wrap}>
      {/* Full screen loading overlay */}
      {purchasing && (
        <div className={styles.purchasingOverlay}>
          <div className={styles.purchasingInner}>
            <span className="spin" style={{width:36,height:36}} />
            <p className={styles.purchasingText}>Opening your box…</p>
          </div>
        </div>
      )}

      <Link href="/dashboard" className={styles.back}>← Back to Drops</Link>

      {drop.logoUrl && (
        <div className={styles.logoBanner}>
          <img src={drop.logoUrl} alt={drop.name} className={styles.logoBannerImg} />
        </div>
      )}

      <div className={styles.header}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          {!drop.logoUrl && (
            <span style={{fontSize:'2rem'}}>{drop.emoji || '🎁'}</span>
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
            onClick={handleChooseForMe}
            disabled={!!buying || available.length === 0}
          >
            {buying && !confirmBoxId ? <span className="spin" style={{width:14,height:14}} /> : 'Buy a Random Box'}
          </button>
          <p className={styles.scrollHint}>Scroll Down to Choose Your Box</p>
        </div>
      </div>

      {error && <div className={styles.errBox}>{error}</div>}

      <div className={styles.sectionRow}>
        <span className={styles.section}>Possible items &amp; odds</span>
      </div>

      <div className={styles.itemGrid}>
        {sortedItems.map((it, i) => {
          const raw = (it.count / drop.boxes.length) * 100
          const pct = raw < 1 ? Math.round(raw * 100) / 100 : Math.round(raw)
          const key = `${it.name}|${it.price}`
          const isHovered = hoveredItem === key
          return (
            <div
              key={i}
              className={`${styles.itemCard} ${isHovered ? styles.itemCardExpanded : ''}`}
              onMouseEnter={() => setHoveredItem(key)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <div className={`${styles.itemImageWrap} ${isHovered ? styles.itemImageWrapExpanded : ''}`}>
                {it.imageUrl ? (
                  <img src={it.imageUrl} alt={it.name} className={styles.itemImage} />
                ) : (
                  <span className={styles.itemEmoji}>🎁</span>
                )}
              </div>
              <div className={styles.itemInfo}>
                <div className={styles.itemName}>{it.name}</div>
                <div className={styles.itemMeta}>
                  <span className={styles.itemPrice}>${it.price}</span>
                  <span className={styles.itemPct}>{raw < 1 ? pct.toFixed(2) : pct}%</span>
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
            onClick={() => !b.sold && handleBoxClick(b.id)}
          >
            {buying === b.id ? <span className="spin" style={{ width: 20, height: 20 }} /> : (
              <>
                <span className={styles.boxEmoji}>{drop.emoji || '🎁'}</span>
                <span className={styles.boxNum}>#{String(i + 1).padStart(2, '0')}</span>
                {!b.sold && <div className={styles.shimmer} />}
              </>
            )}
          </button>
        ))}
      </div>

      {confirmBoxId && (
        <div className={styles.confirmOverlay} onClick={cancelConfirm}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>🎁</div>
            <h2 className={styles.confirmTitle}>
              {confirmRandom ? 'Random Box Selected' : 'Confirm Purchase'}
            </h2>
            <p className={styles.confirmSub}>
              {confirmRandom
                ? `A box has been randomly selected for you.`
                : `You're about to open a mystery box.`}
            </p>
            <div className={styles.confirmPrice}>${drop.boxPrice}</div>
            <p className={styles.confirmBalance}>
              Your balance: ${user.walletBalance.toFixed(2)}
            </p>
            <p className={styles.confirmSellBack}>
              Sell back value: {drop.sellBackPct}% of item value
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmBtn} onClick={confirmPurchase}>
                Confirm Purchase — ${drop.boxPrice}
              </button>
              <button className={styles.cancelBtn} onClick={cancelConfirm}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}