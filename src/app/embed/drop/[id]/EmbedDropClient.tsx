'use client'
import { useState, useEffect } from 'react'

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
  ownerId: string
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

type Theme = {
  primaryColor: string
  backgroundColor: string
  cardColor: string
  textColor: string
  accentColor: string
}

const DEFAULT_THEME: Theme = {
  primaryColor: '#FF6B85',
  backgroundColor: '#08080B',
  cardColor: '#0F0F14',
  textColor: '#EEEEF5',
  accentColor: '#F5C842',
}

// Calculate relative luminance for contrast checking
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a)
  const l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}

// Returns white or black depending on which has better contrast
function readable(bg: string): string {
  return contrastRatio(bg, '#ffffff') >= contrastRatio(bg, '#000000') ? '#ffffff' : '#000000'
}

export default function EmbedDropClient({ drop }: { drop: Drop }) {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME)
  const [themeLoaded, setThemeLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/store/theme/public?ownerId=${drop.ownerId}`)
      .then(r => r.json())
      .then(d => { if (d.ok) { setTheme(d.data); setThemeLoaded(true) } })
      .catch(() => setThemeLoaded(true))
  }, [drop.ownerId])

  const soldOut = drop.availableBoxes === 0
  const pct = Math.round((drop.availableBoxes / drop.totalBoxes) * 100)
  const unsoldBoxes = drop.boxes.filter(b => !b.sold)

  const itemGroups: Record<string, { name: string; price: number; imageUrl: string | null; count: number }> = {}
  const oddsBoxes = drop.pricingType === 'dynamic' ? unsoldBoxes : drop.boxes
  oddsBoxes.forEach(b => {
    const k = `${b.itemName}|||${b.itemPrice}`
    if (!itemGroups[k]) itemGroups[k] = { name: b.itemName, price: b.itemPrice, imageUrl: b.itemImageUrl, count: 0 }
    itemGroups[k].count++
  })
  const odds = Object.values(itemGroups).sort((a, b) => b.price - a.price)
  const total = odds.reduce((s, o) => s + o.count, 0)

  const btnTextColor = readable(theme.primaryColor)
  const accentTextColor = readable(theme.accentColor)

  if (!themeLoaded) return (
    <div style={{ minHeight: '100vh', background: DEFAULT_THEME.backgroundColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: DEFAULT_THEME.textColor, fontSize: '0.85rem' }}>Loading…</span>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: theme.backgroundColor, color: theme.textColor, fontFamily: 'system-ui, sans-serif', padding: '1.5rem 1.25rem 3rem' }}>

      {/* Drop header */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {drop.logoUrl ? (
          <img src={drop.logoUrl} alt={drop.name} style={{ width: 80, height: 80, objectFit: 'contain', background: theme.cardColor, border: `1px solid ${theme.primaryColor}33`, borderRadius: 12, padding: '0.4rem', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 80, height: 80, background: theme.cardColor, border: `1px solid ${theme.primaryColor}33`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', flexShrink: 0 }}>
            {drop.emoji || '🎁'}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.6rem', fontWeight: 700, color: theme.primaryColor, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{drop.category}</div>
          <h1 style={{ fontSize: 'clamp(1.2rem,4vw,1.8rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: '0.2rem', color: theme.textColor }}>{drop.name}</h1>
          <p style={{ fontSize: '0.75rem', color: theme.textColor + '99', marginBottom: '0.75rem' }}>by {drop.owner}</p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { val: `$${drop.boxPrice}`, lbl: 'Per Box', color: theme.accentColor },
              { val: `${drop.sellBackPct}%`, lbl: 'Sell Back', color: '#3DD68C' },
              { val: String(drop.availableBoxes), lbl: 'Remaining', color: '#7EC8FF' },
            ].map(s => (
              <div key={s.lbl} style={{ background: theme.cardColor, border: `1px solid ${theme.primaryColor}22`, borderRadius: 8, padding: '0.4rem 0.7rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 800, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: '0.55rem', color: theme.textColor + '80', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: theme.textColor + '80', marginBottom: '0.3rem' }}>
          <span>{drop.availableBoxes} of {drop.totalBoxes} remaining</span>
          <span>{pct}%</span>
        </div>
        <div style={{ height: 5, background: theme.cardColor, borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: theme.primaryColor, borderRadius: 3 }} />
        </div>
      </div>

      {/* CTA */}
      <div style={{ background: theme.cardColor, border: `1px solid ${theme.primaryColor}44`, borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'center' }}>
        <p style={{ fontSize: '0.78rem', color: theme.textColor + '99', marginBottom: '1rem', lineHeight: 1.5 }}>
          Create a free account to open a box. Keep what you love — or sell back instantly for {drop.sellBackPct}% of item value.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          
            href={`https://www.yorkstores.com/signup?redirect=/dashboard/drop/${drop.id}`}
            target="_top"
            style={{
              background: soldOut ? '#2a2a35' : theme.primaryColor,
              color: soldOut ? 'rgba(255,255,255,0.3)' : btnTextColor,
              border: 'none', borderRadius: 10, padding: '0.65rem 1.5rem',
              fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none',
              display: 'inline-block', pointerEvents: soldOut ? 'none' : 'auto',
            }}
          >
            {soldOut ? 'Sold Out' : `Open a Box — $${drop.boxPrice}`}
          </a>
          
            href={`https://www.yorkstores.com/signin?redirect=/dashboard/drop/${drop.id}`}
            target="_top"
            style={{
              background: 'transparent',
              color: theme.textColor,
              border: `1px solid ${theme.textColor}33`,
              borderRadius: 10, padding: '0.65rem 1.5rem',
              fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Sign In
          </a>
        </div>
        <p style={{ fontSize: '0.6rem', color: theme.textColor + '55', marginTop: '0.6rem' }}>
          Powered by <a href="https://www.yorkstores.com" target="_blank" rel="noopener noreferrer" style={{ color: theme.primaryColor, textDecoration: 'none' }}>Yorkstores</a>
        </p>
      </div>

      {/* Odds */}
      <div>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '0.2rem', color: theme.textColor }}>What's Inside</h2>
        <p style={{ fontSize: '0.68rem', color: theme.textColor + '80', marginBottom: '0.75rem' }}>
          {drop.pricingType === 'dynamic' ? 'Odds based on remaining boxes.' : 'Odds based on all boxes.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {odds.map(item => {
            const oddsPct = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0'
            return (
              <div key={`${item.name}|||${item.price}`} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: theme.cardColor, border: `1px solid ${theme.primaryColor}22`, borderRadius: 8, padding: '0.5rem 0.75rem' }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 5, background: theme.backgroundColor, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, background: theme.backgroundColor, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>🎁</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: theme.textColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</div>
                  <div style={{ fontSize: '0.62rem', color: theme.textColor + '80', marginTop: 1 }}>${item.price.toFixed(2)} value</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 700, color: theme.accentColor }}>{oddsPct}%</div>
                  <div style={{ fontSize: '0.55rem', color: theme.textColor + '80' }}>{item.count} left</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}