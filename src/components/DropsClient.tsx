'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './DropsClient.module.css'

type Drop = {
  id: string
  name: string
  emoji: string
  logoUrl?: string
  owner: string
  boxPrice: number
  totalBoxes: number
  availableBoxes: number
  minPrice: number
  maxPrice: number
}

type User = { id: string; name: string; email: string; role: string; walletBalance: number }

export default function DropsClient({ drops, user }: { drops: Drop[]; user: User }) {
  const router = useRouter()
  const [choiceDropId, setChoiceDropId] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [error, setError] = useState('')

  function openChoice(dropId: string) { setChoiceDropId(dropId); setError('') }
  function closeChoice() { setChoiceDropId(null) }

  async function buyRandom() {
    if (!choiceDropId) return
    setPurchasing(true); setError('')
    try {
      const res = await fetch(`/api/drops/${choiceDropId}/purchase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      closeChoice()
      router.push(`/dashboard/reveal?purchaseId=${data.data.purchaseId}&dropId=${choiceDropId}`)
    } catch {
      setError('Something went wrong.')
    } finally {
      setPurchasing(false)
    }
  }

  function pickBox() {
    if (!choiceDropId) return
    closeChoice()
    router.push(`/dashboard/drop/${choiceDropId}`)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Drops</h1>
        <p className={styles.heroSub}>Choose delivery or sell your item back.</p>
      </div>

      <div className={styles.grid}>
        {drops.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📦</div>
            <p>No drops yet.</p>
          </div>
        ) : drops.map(d => {
          const soldOut = d.availableBoxes === 0
          const pct = Math.round((d.availableBoxes / d.totalBoxes) * 100)
          return (
            <div key={d.id} className={styles.card}>
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${soldOut ? styles.badgeOff : styles.badgeOn}`}>
                  {soldOut ? 'Sold Out' : '● Live'}
                </span>
              </div>
              <div className={styles.cardBanner}>
                {d.logoUrl ? (
                  <img src={d.logoUrl} alt={d.name} className={styles.cardLogo} />
                ) : (
                  <span className={styles.cardEmoji}>{d.emoji || '📦'}</span>
                )}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{d.name}</div>
                <div className={styles.cardOwner}>by {d.owner}</div>
                <div className={styles.stats}>
                  <div className={styles.stat}><div className={styles.statVal}>${d.boxPrice}</div><div className={styles.statLbl}>Price</div></div>
                  <div className={styles.stat}><div className={styles.statVal}>${d.minPrice}–${d.maxPrice}</div><div className={styles.statLbl}>Range</div></div>
                  <div className={styles.stat}><div className={styles.statVal}>{d.totalBoxes}</div><div className={styles.statLbl}>Boxes</div></div>
                </div>
                <div className={styles.progBar}><div className={styles.progFill} style={{ width: `${pct}%` }} /></div>
                <p className={styles.avail}><strong>{d.availableBoxes}</strong> of {d.totalBoxes} remaining</p>
                <button
                  className={styles.openBtn}
                  disabled={soldOut}
                  onClick={() => !soldOut && openChoice(d.id)}
                >
                  {soldOut ? 'Sold Out' : `📦 Open a Box — $${d.boxPrice}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {choiceDropId && (
        <div className={styles.overlay} onClick={closeChoice}>
          <div className={styles.choiceBox} onClick={e => e.stopPropagation()}>
            <h2 className={styles.choiceTitle}>How would you like your box?</h2>
            <p className={styles.choiceSub}>Each box hides a different item — pick one yourself or let us choose for you.</p>
            {error && <div className={styles.choiceError}>{error}</div>}
            <div className={styles.choiceCards}>
              <button className={styles.choiceCard} onClick={buyRandom} disabled={purchasing}>
                <span className={styles.choiceIcon}>🎲</span>
                <span className={styles.choiceName}>Random box</span>
                <span className={styles.choiceDesc}>We pick one at random instantly</span>
              </button>
              <button className={styles.choiceCard} onClick={pickBox} disabled={purchasing}>
                <span className={styles.choiceIcon}>👆</span>
                <span className={styles.choiceName}>Pick my box</span>
                <span className={styles.choiceDesc}>Browse and choose a specific box</span>
              </button>
            </div>
            <button className={styles.choiceCancel} onClick={closeChoice}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}