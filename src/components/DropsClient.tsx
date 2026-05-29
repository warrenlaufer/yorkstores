'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './DropsClient.module.css'

const CATEGORIES = [
  'Bullion',
  'Collectible Coins',
  'Jewelry',
  'Luxury Brands',
  'Other Collectibles',
  'Sporting Goods',
  'Trading Cards',
  'Watches',
]

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
  category: string
  pricingType: string
}

type User = { id: string; name: string; email: string; role: string; walletBalance: number }

export default function DropsClient({ drops, user }: { drops: Drop[]; user: User }) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set(CATEGORIES))

  const allSelected = selected.size === CATEGORIES.length
  const noneSelected = selected.size === 0

  function toggleCategory(cat: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function selectAll() { setSelected(new Set(CATEGORIES)) }
  function selectNone() { setSelected(new Set()) }

  const filtered = drops.filter(d => selected.has(d.category))

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Drops</h1>
        <p className={styles.heroSub}>Choose delivery or sell your item back.</p>
      </div>

      <div className={styles.layout}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Categories</div>
          <div className={styles.sidebarActions}>
            <button className={styles.sidebarAction} onClick={selectAll} disabled={allSelected}>All</button>
            <button className={styles.sidebarAction} onClick={selectNone} disabled={noneSelected}>None</button>
          </div>
          <div className={styles.sidebarList}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`${styles.sidebarItem} ${selected.has(cat) ? styles.sidebarItemActive : ''}`}
                onClick={() => toggleCategory(cat)}
              >
                <span className={styles.sidebarCheck}>{selected.has(cat) ? '✓' : ''}</span>
                {cat}
              </button>
            ))}
          </div>
        </aside>

        {/* Grid */}
        <div className={styles.grid}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🎁</div>
              <p>No drops match your filters.</p>
            </div>
          ) : filtered.map(d => {
            const soldOut = d.availableBoxes === 0
            const pct = Math.round((d.availableBoxes / d.totalBoxes) * 100)
            return (
              <div key={d.id} className={styles.card}>
                <div className={styles.badgeRow}>
                  <span className={`${styles.badge} ${soldOut ? styles.badgeOff : styles.badgeOn}`}>
                    {soldOut ? 'Sold Out' : '● Live'}
                  </span>
                  <span className={styles.badgeCat}>{d.category}</span>
                </div>
                <div className={styles.cardBanner}>
                  {d.logoUrl ? (
                    <img src={d.logoUrl} alt={d.name} className={styles.cardLogo} />
                  ) : (
                    <span className={styles.cardEmoji}>{d.emoji || '🎁'}</span>
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
                    onClick={() => !soldOut && router.push(`/dashboard/drop/${d.id}`)}
                  >
                    {soldOut ? 'Sold Out' : `Explore Drop — $${d.boxPrice}`}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}