'use client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Box = {
  id: string
  itemName: string
  itemPrice: number
  itemShippingCost: number
  itemImageUrl: string | null
  sold: boolean
}

type Drop = {
  id: string
  name: string
  emoji: string
  logoUrl: string | null
  owner: string
  boxPrice: number
  sellBackPct: number
  pricingType: string
  category: string
  totalBoxes: number
  availableBoxes: number
  minPrice: number
  maxPrice: number
  boxes: Box[]
}

export default function PublicDropClient({ drop }: { drop: Drop }) {
  const router = useRouter()
  const soldOut = drop.availableBoxes === 0
  const pct = Math.round((drop.availableBoxes / drop.totalBoxes) * 100)
  const unsoldBoxes = drop.boxes.filter(b => !b.sold)

  // Group items for odds display
  const itemGroups: Record<string, { name: string; price: number; imageUrl: string | null; count: number }> = {}
  const oddsBoxes = drop.pricingType === 'dynamic' ? unsoldBoxes : drop.boxes
  oddsBoxes.forEach(b => {
    const k = `${b.itemName}|||${b.itemPrice}`
    if (!itemGroups[k]) itemGroups[k] = { name: b.itemName, price: b.itemPrice, imageUrl: b.itemImageUrl, count: 0 }
    itemGroups[k].count++
  })
  const odds = Object.values(itemGroups).sort((a, b) => b.price - a.price)
  const total = odds.reduce((s, o) => s + o.count, 0)

  return (
    <div style={{ minHeight: '100vh', background: '#08080B', color: '#EEEEF5', fontFamily: 'var(--font, system-ui)' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" fill="#FF6B85" width="24" height="24">
            <ellipse cx="20" cy="30" rx="13" ry="9"/>
            <ellipse cx="30" cy="16" rx="8" ry="7"/>
            <ellipse cx="37" cy="19" rx="4" ry="3"/>
            <ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)"/>
            <ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)"/>
            <path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23"/>
            <rect x="26" y="36" width="4" height="8" rx="2"/>
            <rect x="20" y="36" width="4" height="8" rx="2"/>
            <rect x="13" y="36" width="4" height="8" rx="2"/>
            <rect x="7" y="35" width="4" height="8" rx="2"/>
            <circle cx="35" cy="15" r="1.2" fill="#0F0F14"/>
            <ellipse cx="40" cy="20" rx="1.5" ry="1" fill="#0F0F14"/>
          </svg>
          <span style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.02em', color: '#EEEEF5' }}>
            York<span style={{ color: '#FF6B85' }}>stores</span>
          </span>
        </Link>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link href="/signin" style={{ background: '#fff', color: '#000', border: '2px solid #FF6B85', borderRadius: 8, padding: '0.4rem 1rem', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>Sign In</Link>
          <Link href="/signup" style={{ background: '#FF6B85', color: '#fff', border: 'none', borderRadius: 8, padding: '0.4rem 1rem', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>Sign Up</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        {/* Drop header */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {drop.logoUrl ? (
            <img src={drop.logoUrl} alt={drop.name} style={{ width: 120, height: 120, objectFit: 'contain', background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, padding: '0.5rem', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 120, height: 120, background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', flexShrink: 0 }}>
              {drop.emoji || '🎁'}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#FF8FA3', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{drop.category}</div>
            <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.3rem' }}>{drop.name}</h1>
            <p style={{ fontSize: '0.82rem', color: '#9898B0', marginBottom: '1rem' }}>by {drop.owner}</p>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '0.5rem 0.85rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: '1.1rem', fontWeight: 800, color: '#F5C842' }}>${drop.boxPrice}</div>
                <div style={{ fontSize: '0.6rem', color: '#9898B0', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Per Box</div>
              </div>
              <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '0.5rem 0.85rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: '1.1rem', fontWeight: 800, color: '#3DD68C' }}>{drop.sellBackPct}%</div>
                <div style={{ fontSize: '0.6rem', color: '#9898B0', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Sell Back</div>
              </div>
              <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '0.5rem 0.85rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: '1.1rem', fontWeight: 800, color: '#7EC8FF' }}>{drop.availableBoxes}</div>
                <div style={{ fontSize: '0.6rem', color: '#9898B0', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Remaining</div>
              </div>
              <div style={{ background: '#0F0F14', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, padding: '0.5rem 0.85rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: '1.1rem', fontWeight: 800, color: '#EEEEF5' }}>${drop.minPrice}–${drop.maxPrice}</div>
                <div style={{ fontSize: '0.6rem', color: '#9898B0', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>Value Range</div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#9898B0', marginBottom: '0.4rem' }}>
            <span>{drop.availableBoxes} of {drop.totalBoxes} boxes remaining</span>
            <span>{pct}%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#FF6B85', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* CTA */}
        <div style={{ background: '#0F0F14', border: '1px solid rgba(255,107,133,0.3)', borderRadius: 16, padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: '#9898B0', marginBottom: '1rem' }}>
            Sign in or create a free account to open a box. Keep what you love — or sell back instantly for {drop.sellBackPct}% of item value.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href={`/signup?redirect=/dashboard/drop/${drop.id}`}
              style={{ background: soldOut ? '#2a2a35' : '#FF6B85', color: soldOut ? 'rgba(255,255,255,0.3)' : '#fff', border: 'none', borderRadius: 12, padding: '0.75rem 2rem', fontWeight: 800, fontSize: '0.95rem', textDecoration: 'none', pointerEvents: soldOut ? 'none' : 'auto' }}
            >
              {soldOut ? 'Sold Out' : `Open a Box — $${drop.boxPrice}`}
            </Link>
            <Link
              href={`/signin?redirect=/dashboard/drop/${drop.id}`}
              style={{ background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0.75rem 2rem', fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none' }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Odds */}
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem' }}>What's Inside</h2>
          <p style={{ fontSize: '0.75rem', color: '#9898B0', marginBottom: '1rem' }}>
            {drop.pricingType === 'dynamic' ? 'Odds based on remaining unsold boxes.' : 'Odds based on all boxes in this drop.'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {odds.map(item => {
              const oddsPct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0'
              return (
                <div key={`${item.name}|||${item.price}`} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#0F0F14', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '0.65rem 0.85rem' }}>
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 6, background: '#1D1D26', flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 44, background: '#1D1D26', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🎁</div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                    <div style={{ fontSize: '0.68rem', color: '#9898B0', marginTop: 2 }}>${item.price.toFixed(2)} value</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--mono, monospace)', fontSize: '0.85rem', fontWeight: 700, color: '#F5C842' }}>{oddsPct}%</div>
                    <div style={{ fontSize: '0.6rem', color: '#9898B0' }}>{item.count} left</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 44" fill="#FF6B85" width="20" height="20">
            <ellipse cx="20" cy="30" rx="13" ry="9"/>
            <ellipse cx="30" cy="16" rx="8" ry="7"/>
            <ellipse cx="37" cy="19" rx="4" ry="3"/>
            <ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)"/>
            <ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)"/>
            <path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23"/>
            <rect x="26" y="36" width="4" height="8" rx="2"/>
            <rect x="20" y="36" width="4" height="8" rx="2"/>
            <rect x="13" y="36" width="4" height="8" rx="2"/>
            <rect x="7" y="35" width="4" height="8" rx="2"/>
            <circle cx="35" cy="15" r="1.2" fill="#0F0F14"/>
            <ellipse cx="40" cy="20" rx="1.5" ry="1" fill="#0F0F14"/>
          </svg>
          <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>York<span style={{ color: '#FF6B85' }}>stores</span></span>
        </div>
        <p style={{ fontSize: '0.7rem', color: '#9898B0' }}>© {new Date().getFullYear()} Yorkstores. All rights reserved.</p>
      </footer>
    </div>
  )
}