'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gift, Check } from 'lucide-react'
import styles from './DropDetailClient.module.css'

type Box = { id: string; itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl?: string; sold: boolean; sku?: string | null }
type Drop = { id: string; name: string; emoji: string; logoUrl?: string; owner: string; boxPrice: number; sellBackPct: number; pricingType: string; boxes: Box[] }
type User = { id: string; name: string; email: string; role: string; walletBalance: number }

export default function DropDetailClient({ drop, user, initialError = '' }: { drop: Drop; user: User | null; initialError?: string }) {
  const router = useRouter()
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState(initialError)
  const [authPrompt, setAuthPrompt] = useState(false)
  useEffect(() => { setError(initialError) }, [initialError])
  const [confirmBoxId, setConfirmBoxId] = useState<string | null>(null)
  const [confirmRandom, setConfirmRandom] = useState(false)
  const [openPrize, setOpenPrize] = useState<number | null>(null)

  const available = drop.boxes.filter(b => !b.sold)
  const scarPct = drop.boxes.length > 0 ? Math.round((available.length / drop.boxes.length) * 100) : 0
  const isDynamic = drop.pricingType === 'dynamic'

  // For odds: dynamic uses unsold boxes only, fixed uses all boxes
  const oddsBoxes = isDynamic ? available : drop.boxes

  // Group by SKU for live-priced (USC) coins so a sold box's frozen price and an unsold box's
  // refreshed price don't split one coin into several prize entries; other items group by name+price.
  const itemMap: Record<string, { name: string; price: number; count: number; imageUrl?: string }> = {}
  oddsBoxes.forEach(b => {
    const k = b.sku ? `sku:${b.sku}` : `${b.itemName}|${b.itemPrice}`
    if (!itemMap[k]) itemMap[k] = { name: b.itemName, price: b.itemPrice, count: 0, imageUrl: b.itemImageUrl }
    itemMap[k].count++
    if (!b.sold) itemMap[k].price = b.itemPrice // show the current (unsold) value for the coin
  })
  const sortedItems = Object.values(itemMap).sort((a, b) => b.price - a.price)

  async function confirmPurchase() {
    if (!confirmBoxId) return
    if (!user) { setConfirmBoxId(null); setConfirmRandom(false); setAuthPrompt(true); return }
    const boxToOpen = confirmBoxId
    setError('')
    setBuying(boxToOpen)
    setConfirmBoxId(null)
    setConfirmRandom(false)

    const purchasePromise = fetch(`/api/drops/${drop.id}/purchase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boxId: boxToOpen }),
    })

    router.push(`/dashboard/reveal?pending=1&dropId=${drop.id}&boxId=${boxToOpen}`)

    try {
      const res = await purchasePromise
      const data = await res.json()
      if (!res.ok) {
        router.push(`/drop/${drop.id}?error=${encodeURIComponent(data.error)}`)
        return
      }
      router.replace(`/dashboard/reveal?purchaseId=${data.data.purchaseId}&dropId=${drop.id}`)
    } catch {
      router.push(`/drop/${drop.id}?error=Something+went+wrong`)
    }
  }

  function handleBoxClick(boxId: string) {
    if (buying) return
    if (!user) { setAuthPrompt(true); return }
    setConfirmBoxId(boxId)
    setConfirmRandom(false)
  }

  function handleChooseForMe() {
    if (buying || available.length === 0) return
    if (!user) { setAuthPrompt(true); return }
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
      <Link href="/" className={styles.back}>← Back to Drops</Link>

      {drop.logoUrl && (
        <div className={styles.logoBanner}>
          <img src={drop.logoUrl} alt={drop.name} className={styles.logoBannerImg} />
        </div>
      )}

      <div className={styles.header}>
        <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
          {!drop.logoUrl && (
            drop.emoji ? <span style={{ fontSize: '2rem' }}>{drop.emoji}</span> : <Gift size={30} strokeWidth={1.3} />
          )}
          <div>
            <h1 className={styles.title}>{drop.name}</h1>
            <p className={styles.sub}>
              {available.length} {available.length === 1 ? 'box' : 'boxes'} available · by {drop.owner}
              {isDynamic && <span className={styles.dynamicBadge}>Dynamic Pricing</span>}
            </p>
          </div>
        </div>
        <div className={styles.priceGroup}>
          <div className={styles.priceTag}>
            <div className={styles.priceVal}>${drop.boxPrice}</div>
            <div className={styles.priceLbl}>per box</div>
          </div>
          <div className={styles.buybackChip}>{drop.sellBackPct}% buyback</div>
        </div>
      </div>

      {error && <div className={styles.errBox}>{error}</div>}

      <div className={styles.sectionRow}>
        <span className={styles.section}>
          What's inside
          {isDynamic && <span style={{ color: 'var(--text3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: 6, fontSize: '0.6rem' }}>(odds update as boxes open)</span>}
        </span>
        <span className={styles.railCount}>{sortedItems.length} possible {sortedItems.length === 1 ? 'prize' : 'prizes'} · best first</span>
      </div>

      <div className={styles.prizeRail}>
        {sortedItems.map((it, i) => {
          const raw = (it.count / oddsBoxes.length) * 100
          const pct = raw < 1 ? Math.round(raw * 100) / 100 : Math.round(raw)
          const ratio = drop.boxPrice > 0 ? it.price / drop.boxPrice : 1
          const tier = ratio >= 8 ? styles.leg : ratio >= 3 ? styles.epi : ratio >= 1.5 ? styles.rar : ''
          return (
            <div key={i} className={`${styles.prizeCard} ${tier} ${openPrize === i ? styles.prizeOpen : ''}`} onClick={() => setOpenPrize(openPrize === i ? null : i)}>
              <div className={styles.prizeImg}>
                {it.imageUrl ? <img src={it.imageUrl} alt={it.name} className={styles.prizeImgTag} /> : <Gift size={30} strokeWidth={1.3} className={styles.prizeIcon} />}
              </div>
              <div className={styles.prizeName}>{it.name}</div>
              <div className={styles.prizeFoot}>
                <span className={styles.prizeVal}>${it.price}</span>
                <span className={styles.prizeOdds}>{raw < 1 ? pct.toFixed(2) : pct}%</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className={styles.hero}>
        <button className={styles.heroBox} onClick={handleChooseForMe} disabled={!!buying || available.length === 0} aria-label="Open a random box">
          <span className={styles.hbKnot} />
          <span className={styles.hbLid}>
            <svg width="20" height="22" viewBox="0 0 42 44" aria-hidden="true"><g fill="#2A0C11"><ellipse cx="20" cy="30" rx="13" ry="9"/><ellipse cx="30" cy="16" rx="8" ry="7"/><ellipse cx="37" cy="19" rx="4" ry="3"/><ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)"/><ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)"/><path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23"/><rect x="26" y="36" width="4" height="8" rx="2"/><rect x="20" y="36" width="4" height="8" rx="2"/><rect x="13" y="36" width="4" height="8" rx="2"/><rect x="7" y="35" width="4" height="8" rx="2"/></g></svg>
          </span>
          <span className={styles.hbBody} />
          <span className={styles.hbRibV} /><span className={styles.hbRibH} />
        </button>
        <button className={styles.openHeroBtn} onClick={handleChooseForMe} disabled={!!buying || available.length === 0}>
          {buying && !confirmBoxId ? <span className="spin" style={{ width: 16, height: 16 }} /> : (available.length === 0 ? 'Sold out' : `Open a Box — $${drop.boxPrice}`)}
        </button>
        <div className={styles.scar}>
          <div className={styles.scarRow}><span>{available.length} {available.length === 1 ? 'box' : 'boxes'} available</span><span>random &amp; fair</span></div>
          <div className={styles.scarBar}><div className={styles.scarFill} style={{ width: `${scarPct}%` }} /></div>
        </div>
      </div>

      {available.length > 0 && (
        <>
          <div className={styles.pickHd}>— or pick your own box —</div>
          <div className={styles.boxStrip}>
            {drop.boxes.map((b, i) => (
              <button
                key={b.id}
                className={`${styles.stripBox} ${b.sold ? styles.stripBoxSold : ''}`}
                disabled={b.sold || !!buying}
                onClick={() => !b.sold && handleBoxClick(b.id)}
                aria-label={b.sold ? 'Opened box' : `Open box ${i + 1}`}
              >
                {buying === b.id ? <span className="spin" style={{ width: 16, height: 16 }} /> : (
                  <>
                    <span className={styles.stripIcon}>{b.sold ? <Check size={16} /> : <Gift size={16} />}</span>
                    <span className={styles.stripNum}>#{String(i + 1).padStart(2, '0')}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {confirmBoxId && (
        <div className={styles.confirmOverlay} onClick={cancelConfirm}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}><Gift size={40} strokeWidth={1.4} /></div>
            <h2 className={styles.confirmTitle}>
              {confirmRandom ? 'Random Box Selected' : 'Confirm Purchase'}
            </h2>
            <p className={styles.confirmSub}>
              {confirmRandom
                ? `A box has been randomly selected for you.`
                : `You're about to open a mystery box.`}
            </p>
            <div className={styles.confirmPrice}>${drop.boxPrice}</div>
            <p className={styles.confirmBalance}>Your balance: ${user?.walletBalance.toFixed(2) ?? '0.00'}</p>
            <p className={styles.confirmSellBack}>Sell back value: {drop.sellBackPct}% of item value</p>
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
      {authPrompt && (
        <div className={styles.confirmOverlay} onClick={() => setAuthPrompt(false)}>
          <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}>🔑</div>
            <h2 className={styles.confirmTitle}>Log in to buy</h2>
            <p className={styles.confirmSub}>Create an account or log in to open mystery boxes.</p>
            <div className={styles.confirmActions}>
              <Link href={`/signup?next=/drop/${drop.id}`} className={styles.confirmBtn} style={{ textDecoration: 'none', textAlign: 'center' }}>
                Sign up
              </Link>
              <Link href={`/signin?next=/drop/${drop.id}`} className={styles.cancelBtn} style={{ textDecoration: 'none', textAlign: 'center' }}>
                Log in
              </Link>
            </div>
            <button className={styles.cancelBtn} style={{ marginTop: 8 }} onClick={() => setAuthPrompt(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  )
}