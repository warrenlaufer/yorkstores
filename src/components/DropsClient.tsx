'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './DropsClient.module.css'
import { CATEGORIES, subcategoriesFor, ALL_SUBCATEGORIES } from '@/lib/categories'

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
  subcategory?: string | null
  sellBackPct: number
  createdAt: string
  recentPurchases: number
}

type User = { id: string; name: string; email: string; role: string; walletBalance: number }

export default function DropsClient({ drops, user }: { drops: Drop[]; user: User | null }) {
  const router = useRouter()
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set(CATEGORIES))
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set(ALL_SUBCATEGORIES))
  const [sort, setSort] = useState('newest')
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set())

  const stores = Array.from(new Set(drops.map(d => d.owner))).sort()

  const allCatsSelected = selectedCats.size === CATEGORIES.length
  const noCatsSelected = selectedCats.size === 0
  const allStoresSelected = selectedStores.size === 0

  function toggleCat(cat: string) {
    setSelectedCats(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  function toggleStore(store: string) {
    setSelectedStores(prev => {
      const next = new Set(prev)
      if (next.has(store)) next.delete(store)
      else next.add(store)
      return next
    })
  }

  function toggleSub(sub: string) {
    setSelectedSubs(prev => {
      const next = new Set(prev)
      if (next.has(sub)) next.delete(sub)
      else next.add(sub)
      return next
    })
  }

  function selectAllCats() { setSelectedCats(new Set(CATEGORIES)) }
  function clearCats() { setSelectedCats(new Set()) }
  function clearStores() { setSelectedStores(new Set()) }

  const filtered = drops.filter(d => {
    const catMatch = selectedCats.has(d.category)
    const subMatch = !d.subcategory || selectedSubs.has(d.subcategory)
    const storeMatch = selectedStores.size === 0 || selectedStores.has(d.owner)
    return catMatch && subMatch && storeMatch
  })

  const time = (s: string) => new Date(s).getTime()
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case 'oldest': return time(a.createdAt) - time(b.createdAt)
      case 'price_desc': return b.boxPrice - a.boxPrice
      case 'price_asc': return a.boxPrice - b.boxPrice
      case 'buyback_desc': return b.sellBackPct - a.sellBackPct
      case 'buyback_asc': return a.sellBackPct - b.sellBackPct
      case 'remaining_desc': return b.availableBoxes - a.availableBoxes
      case 'remaining_asc': return a.availableBoxes - b.availableBoxes
      case 'newest':
      default: return time(b.createdAt) - time(a.createdAt)
    }
  })

  function getBadges(d: Drop) {
    const badges: { label: string; cls: string }[] = []
    const now = Date.now()
    const created = new Date(d.createdAt).getTime()
    const dayMs = 24 * 60 * 60 * 1000
    if (now - created < 24 * dayMs) badges.push({ label: 'New', cls: styles.badgeNew })
    if (d.recentPurchases >= 10) badges.push({ label: '🔥 Hot', cls: styles.badgeHot })
    if (d.sellBackPct > 94) badges.push({ label: 'High Buyback %', cls: styles.badgeHighBuyback })
    if (d.availableBoxes === 0) badges.push({ label: 'Sold Out', cls: styles.badgeOff })
    return badges.slice(0, 3)
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Drops</h1>
        <p className={styles.heroSub}>Choose delivery or sell your item back.</p>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Categories</div>
          <div className={styles.sidebarActions}>
            <button className={styles.sidebarAction} onClick={selectAllCats} disabled={allCatsSelected}>All</button>
            <button className={styles.sidebarAction} onClick={clearCats} disabled={noCatsSelected}>None</button>
          </div>
          <div className={styles.sidebarList}>
            {CATEGORIES.map(cat => {
              const subs = subcategoriesFor(cat)
              const catSelected = selectedCats.has(cat)
              return (
                <div key={cat}>
                  <button
                    className={`${styles.sidebarItem} ${catSelected ? styles.sidebarItemActive : ''}`}
                    onClick={() => toggleCat(cat)}
                  >
                    <span className={styles.sidebarCheck}>{catSelected ? '✓' : ''}</span>
                    {cat}
                  </button>
                  {subs.length > 0 && catSelected && subs.map(sub => (
                    <button
                      key={sub}
                      className={`${styles.sidebarItem} ${selectedSubs.has(sub) ? styles.sidebarItemActive : ''}`}
                      style={{ paddingLeft: 30, fontSize: '0.66rem' }}
                      onClick={() => toggleSub(sub)}
                    >
                      <span className={styles.sidebarCheck}>{selectedSubs.has(sub) ? '✓' : ''}</span>
                      {sub}
                    </button>
                  ))}
                </div>
              )
            })}
          </div>

          {stores.length > 0 && (
            <>
              <div className={styles.sidebarDivider} />
              <div className={styles.sidebarTitle}>Stores</div>
              <div className={styles.sidebarActions}>
                <button className={styles.sidebarAction} onClick={clearStores} disabled={allStoresSelected}>All</button>
                <button className={styles.sidebarAction} onClick={() => setSelectedStores(new Set(stores))} disabled={selectedStores.size === stores.length}>None</button>
              </div>
              <div className={styles.sidebarList}>
                {stores.map(store => (
                  <button
                    key={store}
                    className={`${styles.sidebarItem} ${selectedStores.has(store) ? styles.sidebarItemActive : ''}`}
                    onClick={() => toggleStore(store)}
                  >
                    <span className={styles.sidebarCheck}>{selectedStores.has(store) ? '✓' : ''}</span>
                    {store}
                  </button>
                ))}
              </div>
            </>
          )}
        </aside>

        <div className={styles.main}>
          <div className={styles.toolbar}>
            <span className={styles.resultCount}>{sorted.length} {sorted.length === 1 ? 'drop' : 'drops'}</span>
            <div className={styles.sortWrap}>
              <label className={styles.sortLabel}>Sort</label>
              <select className={styles.sortSelect} value={sort} onChange={e => setSort(e.target.value)}>
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="price_desc">Box price: high to low</option>
                <option value="price_asc">Box price: low to high</option>
                <option value="buyback_desc">Buyback %: high to low</option>
                <option value="buyback_asc">Buyback %: low to high</option>
                <option value="remaining_desc">Boxes remaining: high to low</option>
                <option value="remaining_asc">Boxes remaining: low to high</option>
              </select>
            </div>
          </div>

          <div className={styles.grid}>
            {sorted.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🎁</div>
                <p>No drops match your filters.</p>
              </div>
            ) : sorted.map(d => {
            const soldOut = d.availableBoxes === 0
            const pct = Math.round((d.availableBoxes / d.totalBoxes) * 100)
            const badges = getBadges(d)
            return (
              <div
                key={d.id}
                className={styles.card}
                onClick={() => !soldOut && router.push(`/drop/${d.id}`)}
                style={{ cursor: soldOut ? 'default' : 'pointer' }}
              >
                <div className={styles.badgeRows}>
                  <div className={styles.badgeRowTop}>
                    <span className={styles.badgeCat}>{d.category}{d.subcategory ? ` · ${d.subcategory}` : ''}</span>
                  </div>
                  <div className={styles.badgeRowBottom}>
                    {badges.map(b => (
                      <span key={b.label} className={`${styles.badge} ${b.cls}`}>{b.label}</span>
                    ))}
                  </div>
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
                    onClick={e => { e.stopPropagation(); !soldOut && router.push(`/drop/${d.id}`) }}
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
    </div>
  )
}