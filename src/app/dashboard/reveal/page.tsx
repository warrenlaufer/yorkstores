'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './reveal.module.css'

type PurchaseData = {
  purchaseId: string
  box: { itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl?: string }
  pricePaid: number
  newBalance: number
  revealedAt: string | null
}

type AddressForm = {
  recipientName: string; recipientEmail: string; addressLine1: string; addressLine2: string
  city: string; state: string; postcode: string; country: string
}

type Rarity = { tier: string; label: string; color: string; particles: number; confetti: number; shake: boolean }
type Particle = { id: number; dx: string; dy: string; size: number; color: string }

const COUNTDOWN_SECONDS = 300
const COMMON: Rarity = { tier: 'common', label: '', color: '#FF6B85', particles: 16, confetti: 0, shake: false }

function getRarity(itemPrice: number, pricePaid: number): Rarity {
  const ratio = pricePaid > 0 ? itemPrice / pricePaid : 1
  if (ratio >= 8) return { tier: 'legendary', label: 'Legendary pull', color: '#FFD66B', particles: 44, confetti: 170, shake: true }
  if (ratio >= 3) return { tier: 'epic', label: 'Epic pull', color: '#C084FC', particles: 34, confetti: 120, shake: true }
  if (ratio >= 1.5) return { tier: 'rare', label: 'Rare pull', color: '#FF6B85', particles: 26, confetti: 80, shake: false }
  return COMMON
}

function genParticles(n: number, color: string): Particle[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * 2) * (i / n) + Math.random() * 0.5
    const dist = 60 + Math.random() * 95
    const size = 5 + Math.random() * 7
    const c = i % 4 === 0 ? '#FFD66B' : i % 4 === 1 ? '#fff' : color
    return { id: i, dx: `${Math.cos(a) * dist}px`, dy: `${Math.sin(a) * dist - 22}px`, size, color: c }
  })
}

function confettiColors(tier: string): string[] {
  if (tier === 'legendary' || tier === 'epic') return ['#FFD66B', '#C084FC', '#FF6B85', '#fff', '#3DD68C']
  return ['#FF6B85', '#FFD66B', '#fff']
}

const DOG = (color: string) => (
  <svg width="24" height="26" viewBox="0 0 42 44" aria-hidden="true">
    <g fill={color}>
      <ellipse cx="20" cy="30" rx="13" ry="9" /><ellipse cx="30" cy="16" rx="8" ry="7" /><ellipse cx="37" cy="19" rx="4" ry="3" />
      <ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)" /><ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)" />
      <path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23" />
      <rect x="26" y="36" width="4" height="8" rx="2" /><rect x="20" y="36" width="4" height="8" rx="2" /><rect x="13" y="36" width="4" height="8" rx="2" /><rect x="7" y="35" width="4" height="8" rx="2" />
    </g>
  </svg>
)

function Confetti({ active, count = 120, colors }: { active: boolean; count?: number; colors?: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  useEffect(() => {
    if (!active || count <= 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const palette = colors && colors.length ? colors : ['#FF6B85', '#F5C842', '#3DD68C', '#60A5FA', '#C084FC', '#fff']
    const pieces = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * 100,
      w: 6 + Math.random() * 10, h: 4 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.15,
      vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 5, opacity: 1,
    }))
    const start = performance.now()
    function draw(now: number) {
      if (!ctx || !canvas) return
      const elapsed = now - start
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.rot += p.rotSpeed; p.vy += 0.08
        if (elapsed > 2000) p.opacity = Math.max(0, p.opacity - 0.012)
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore()
      })
      if (elapsed < 4000) animRef.current = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [active, count, colors])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }} />
}

function getSecondsRemaining(revealedAt: string | null): number {
  if (!revealedAt) return COUNTDOWN_SECONDS
  const elapsed = Math.floor((Date.now() - new Date(revealedAt).getTime()) / 1000)
  return Math.max(0, COUNTDOWN_SECONDS - elapsed)
}

function RevealContent() {
  const params = useSearchParams()
  const router = useRouter()
  const purchaseId = params.get('purchaseId')
  const dropId = params.get('dropId')
  const pending = params.get('pending')

  const [data, setData] = useState<PurchaseData | null>(null)
  const [phase, setPhase] = useState<'opening' | 'revealed' | 'done'>('opening')
  const [anim, setAnim] = useState<'charge' | 'burst' | 'revealed'>('charge')
  const [particles, setParticles] = useState<Particle[]>([])
  const [shake, setShake] = useState(false)
  const [skipAnim, setSkipAnim] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)
  const [actionsVisible, setActionsVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [showAddr, setShowAddr] = useState(false)
  const [addrForm, setAddrForm] = useState<AddressForm>({
    recipientName: '', recipientEmail: '', addressLine1: '', addressLine2: '',
    city: '', state: '', postcode: '', country: 'United States',
  })
  const [addrError, setAddrError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<'delivery' | 'soldback' | null>(null)
  const [outcomeMsg, setOutcomeMsg] = useState('')
  const [taxPreview, setTaxPreview] = useState<number | null>(null)
  const [taxLoading, setTaxLoading] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const hasAutoSold = useRef(false)
  const dataRef = useRef<PurchaseData | null>(null)
  const firedRef = useRef(false)
  const minChargeRef = useRef(false)
  const skipRef = useRef(false)
  const reducedRef = useRef(false)

  const rarity = data ? getRarity(data.box.itemPrice, data.pricePaid) : COMMON

  useEffect(() => { dataRef.current = data }, [data])

  function revealNow() {
    firedRef.current = true; skipRef.current = true
    setSkipAnim(true); setAnim('revealed')
    setParticles([]); setShowConfetti(false)
    setCardVisible(true); setActionsVisible(true); setPhase('revealed')
  }

  function fireBurst() {
    if (skipRef.current || reducedRef.current) { revealNow(); return }
    const d = dataRef.current
    const r = d ? getRarity(d.box.itemPrice, d.pricePaid) : COMMON
    setAnim('burst')
    setParticles(genParticles(r.particles, r.color))
    if (r.confetti > 0) setShowConfetti(true)
    if (r.shake) { setShake(true); setTimeout(() => setShake(false), 480) }
    setTimeout(() => setCardVisible(true), 520)
    setTimeout(() => { setActionsVisible(true); setPhase('revealed'); setAnim('revealed'); router.refresh() }, 1100)
  }

  function maybeBurst(force?: boolean) {
    if (firedRef.current) return
    if (!minChargeRef.current) return
    if (!dataRef.current && !force) return
    firedRef.current = true
    fireBurst()
  }

  function startTimer(revealedAt: string | null) {
    if (timerRef.current) clearInterval(timerRef.current)
    const remaining = getSecondsRemaining(revealedAt)
    setCountdown(remaining)
    if (remaining <= 0) { handleAutoSell(); return }
    timerRef.current = setInterval(() => {
      const r = getSecondsRemaining(revealedAt)
      setCountdown(r)
      if (r <= 0) { clearInterval(timerRef.current!); handleAutoSell() }
    }, 1000)
  }

  useEffect(() => {
    if (!pending) return
    pollRef.current = setInterval(() => {
      const current = new URLSearchParams(window.location.search)
      const pid = current.get('purchaseId')
      if (pid) {
        clearInterval(pollRef.current!)
        fetch(`/api/orders?purchaseId=${pid}`)
          .then(r => r.json())
          .then(d => {
            if (d.ok && d.data) {
              const p = d.data.find((x: any) => x.id === pid)
              if (p) setData({
                purchaseId: pid,
                box: { itemName: p.itemName, itemPrice: p.itemPrice, itemShippingCost: p.itemShippingCost, itemImageUrl: p.itemImageUrl },
                pricePaid: p.pricePaid, newBalance: 0,
                revealedAt: p.revealedAt ?? null,
              })
            }
          }).catch(() => {})
      }
    }, 200)
    return () => clearInterval(pollRef.current!)
  }, [pending])

  useEffect(() => {
    if (!purchaseId || pending) return
    fetch(`/api/orders?purchaseId=${purchaseId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data) {
          const p = d.data.find((x: any) => x.id === purchaseId)
          if (p) {
            setData({
              purchaseId,
              box: { itemName: p.itemName, itemPrice: p.itemPrice, itemShippingCost: p.itemShippingCost, itemImageUrl: p.itemImageUrl },
              pricePaid: p.pricePaid, newBalance: 0,
              revealedAt: p.revealedAt ?? null,
            })
            if (p.outcome === 'DELIVERY') {
              firedRef.current = true
              setOutcome('delivery'); setOutcomeMsg('Delivery already confirmed.')
              setPhase('revealed'); setAnim('revealed'); setCardVisible(true); setActionsVisible(false)
            } else if (p.outcome === 'SOLD_BACK' || p.outcome === 'AUTO_SOLD') {
              firedRef.current = true
              setOutcome('soldback'); setOutcomeMsg(`Already sold back — $${Number(p.refundAmt).toFixed(2)} was credited.`)
              setPhase('revealed'); setAnim('revealed'); setCardVisible(true); setActionsVisible(false)
            }
          }
        }
      }).catch(() => {})
  }, [purchaseId])

  useEffect(() => {
    if (!pending && !purchaseId) { router.push('/'); return }
    reducedRef.current = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    if (reducedRef.current) { skipRef.current = true; setSkipAnim(true) }
    const minMs = reducedRef.current ? 0 : 1300
    const t1 = setTimeout(() => { minChargeRef.current = true; maybeBurst() }, minMs)
    const t2 = setTimeout(() => { minChargeRef.current = true; maybeBurst(true) }, 5000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  useEffect(() => { maybeBurst() }, [data])

  useEffect(() => {
    if (phase !== 'revealed' || outcome) return
    if (!data) return
    startTimer(data.revealedAt)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, outcome, data])

  function stopTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  const getPurchaseId = () => purchaseId || new URLSearchParams(window.location.search).get('purchaseId') || ''

  async function handleSellBack() {
    stopTimer(); setSubmitting(true)
    const res = await fetch('/api/orders/sellback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId: getPurchaseId() }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setOutcome('soldback')
      setOutcomeMsg(`$${d.data.refundAmount.toFixed(2)} has been credited to your account.`)
      router.refresh()
    } else setOutcomeMsg(d.error)
  }

  async function handleAutoSell() {
    if (hasAutoSold.current) return
    hasAutoSold.current = true
    const res = await fetch('/api/orders/sellback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId: getPurchaseId() }),
    })
    const d = await res.json()
    if (res.ok) {
      setOutcome('soldback')
      setOutcomeMsg(`Time expired — $${d.data.refundAmount.toFixed(2)} has been credited to your account.`)
      router.refresh()
    } else setOutcomeMsg('Time expired — sell-back failed.')
    setActionsVisible(false)
  }

  function openDelivery() { stopTimer(); setShowAddr(true) }
  function cancelDelivery() { setShowAddr(false) }

  useEffect(() => { setTaxPreview(null) }, [addrForm.addressLine1, addrForm.city, addrForm.state, addrForm.postcode, addrForm.country])

  async function previewTax() {
    setTaxLoading(true); setAddrError('')
    try {
      const res = await fetch('/api/orders/tax-preview', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseId: getPurchaseId(), ...addrForm }),
      })
      const d = await res.json()
      if (res.ok) setTaxPreview(d.data.tax)
      else setAddrError(d.error)
    } catch { setAddrError('Could not calculate tax.') }
    finally { setTaxLoading(false) }
  }

  async function submitDelivery() {
    setAddrError('')
    if (!addrForm.recipientName || !addrForm.recipientEmail || !addrForm.addressLine1 || !addrForm.city || !addrForm.postcode) {
      setAddrError('Please fill in all required fields.'); return
    }
    setSubmitting(true)
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId: getPurchaseId(), ...addrForm }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setShowAddr(false)
      setOutcome('delivery')
      setOutcomeMsg(`Delivery confirmed — we'll ship to ${addrForm.recipientName}, ${addrForm.city}.`)
      router.refresh()
    } else setAddrError(d.error)
  }

  const safeCountdown = countdown ?? COUNTDOWN_SECONDS
  const mins = Math.floor(safeCountdown / 60)
  const secs = safeCountdown % 60
  const pct = (safeCountdown / COUNTDOWN_SECONDS) * 100
  const barColor = safeCountdown <= 60 ? '#ff3355' : safeCountdown <= 120 ? '#FF8C00' : '#FF6B85'
  const urgent = safeCountdown <= 30

  return (
    <div className={styles.screen}>
      <Confetti active={showConfetti} count={rarity.confetti} colors={confettiColors(rarity.tier)} />

      <div className={`${styles.stage} ${anim === 'charge' ? styles.charge : ''} ${anim === 'burst' ? styles.burst : ''} ${shake ? styles.stageShake : ''}`}>
        <div className={`${styles.fx} ${styles.glow}`} style={{ background: `radial-gradient(circle, ${rarity.color}99 0%, transparent 68%)` }} />
        <div className={`${styles.fx} ${styles.beam}`} style={{ background: `linear-gradient(to top, ${rarity.color}bf, transparent)` }} />
        <div className={`${styles.fx} ${styles.ring}`} style={{ border: `3px solid ${rarity.color}` }} />
        <div className={styles.flash} />

        {anim !== 'revealed' && (
          <div className={styles.cBoxWrap}>
            <div className={`${styles.cBox} ${anim === 'charge' ? styles.charging : ''} ${anim === 'burst' ? styles.opened : ''}`}>
              <div className={styles.cKnot} />
              <div className={styles.cLid}>{DOG('#2A0C11')}</div>
              <div className={styles.cBody}><span className={styles.cRibV} /><span className={styles.cRibH} /></div>
            </div>
          </div>
        )}

        {particles.map(p => (
          <span key={p.id} className={styles.particle} style={{ ['--dx' as any]: p.dx, ['--dy' as any]: p.dy, width: p.size, height: p.size, background: p.color }} />
        ))}

        {anim !== 'revealed' && !skipAnim && (
          <button className={styles.skipBtn} onClick={revealNow}>Skip ▸</button>
        )}
      </div>

      {data && (
        <div className={`${styles.revealCard} ${cardVisible ? styles.revealCardVisible : ''}`}>
          {rarity.tier !== 'common' && (
            <div className={styles.rarityStamp} style={{ color: rarity.color, borderColor: rarity.color }}>{rarity.label}</div>
          )}

          {data.box.itemImageUrl && (
            <div className={styles.itemImageWrap} style={{ position: 'relative' }}>
              <div className={`${styles.halo} ${cardVisible ? styles.haloShow : ''}`} style={{ background: `conic-gradient(from 0deg, transparent, ${rarity.color}66, transparent, ${rarity.color}66, transparent)` }} />
              <img src={data.box.itemImageUrl} alt={data.box.itemName} className={`${styles.itemImage} ${skipAnim ? '' : styles.riseIn}`} />
            </div>
          )}

          <div className={styles.revealBody}>
            <div className={styles.revealLabel}>You revealed</div>
            <div className={styles.revealName}>{data.box.itemName}</div>
            <div className={styles.revealVal}>
              ${data.box.itemPrice.toFixed(2)} value
              {data.box.itemShippingCost > 0 ? ` · $${data.box.itemShippingCost.toFixed(2)} shipping` : ''}
            </div>

            {!outcome && countdown !== null && (
              <div className={styles.countdown}>
                <div className={styles.countdownLabel}>Sell back automatically in</div>
                <div className={styles.countdownBarBg}>
                  <div className={styles.countdownBar} style={{ width: `${pct}%`, background: barColor }} />
                </div>
                <div className={`${styles.countdownTime} ${urgent ? styles.urgent : ''}`}>
                  {mins}:{String(secs).padStart(2, '0')}
                </div>
              </div>
            )}

            {actionsVisible && !outcome && (
              <div className={styles.actions}>
                <button className={styles.deliveryBtn} onClick={openDelivery} disabled={submitting}>Take delivery</button>
                <button className={styles.sellBtn} onClick={handleSellBack} disabled={submitting}>
                  {submitting ? <span className="spin" /> : `Sell back — get $${(data.box.itemPrice * 0.9).toFixed(2)} credit`}
                </button>
              </div>
            )}

            {outcome && (
              <div className={`${styles.outcomeMsg} ${outcome === 'delivery' ? styles.outcomeDel : styles.outcomeSold}`}>
                {outcomeMsg}
              </div>
            )}

            {outcome && (
              <div className={styles.backBtns}>
                <button className={styles.backBtn} onClick={() => router.push(`/drop/${dropId}`)}>Back to this drop</button>
                <button className={styles.backBtnAlt} onClick={() => router.push('/')}>Back to all drops</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showAddr && (
        <div className={styles.addrOverlay} onClick={cancelDelivery}>
          <div className={styles.addrBox} onClick={e => e.stopPropagation()}>
            <h2 className={styles.addrTitle}>Shipping address</h2>
            <div className={styles.addrSub}>
              {(() => {
                const shipping = data?.box.itemShippingCost ?? 0
                const tax = taxPreview ?? 0
                const total = Math.round((shipping + tax) * 100) / 100
                return (
                  <span style={{ display: 'block', lineHeight: 1.8 }}>
                    Shipping: {shipping > 0 ? `$${shipping.toFixed(2)}` : 'Free'}<br />
                    {taxPreview === null
                      ? <span style={{ color: 'var(--text3)' }}>Sales tax is calculated from your address — fill it in, then tap “Calculate sales tax”.</span>
                      : <>Sales tax (on ${(data?.pricePaid ?? 0).toFixed(2)} box price): ${tax.toFixed(2)}<br /><strong>Total charged at delivery: ${total.toFixed(2)}</strong></>}
                  </span>
                )
              })()}
            </div>
            {addrError && <div className={styles.addrErr}>{addrError}</div>}
            <div className="field"><label>Full Name</label><input value={addrForm.recipientName} onChange={e => setAddrForm(p => ({ ...p, recipientName: e.target.value }))} /></div>
            <div className="field"><label>Email (for tracking)</label><input type="email" value={addrForm.recipientEmail} onChange={e => setAddrForm(p => ({ ...p, recipientEmail: e.target.value }))} /></div>
            <div className="field"><label>Address Line 1</label><input value={addrForm.addressLine1} onChange={e => setAddrForm(p => ({ ...p, addressLine1: e.target.value }))} /></div>
            <div className="field"><label>Address Line 2 (optional)</label><input value={addrForm.addressLine2} onChange={e => setAddrForm(p => ({ ...p, addressLine2: e.target.value }))} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div className="field"><label>City</label><input value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))} /></div>
              <div className="field"><label>State / County</label><input value={addrForm.state} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <div className="field"><label>Postcode / ZIP</label><input value={addrForm.postcode} onChange={e => setAddrForm(p => ({ ...p, postcode: e.target.value }))} /></div>
              <div className="field"><label>Country</label><input value={addrForm.country} onChange={e => setAddrForm(p => ({ ...p, country: e.target.value }))} /></div>
            </div>
            <button type="button" onClick={previewTax} disabled={taxLoading}
              style={{ marginTop: '0.7rem', width: '100%', background: 'transparent', color: '#7EE0FF', border: '1px solid rgba(126,224,255,0.4)', borderRadius: 7, fontFamily: 'var(--font)', fontSize: '0.74rem', fontWeight: 700, padding: '0.45rem 0.9rem', cursor: 'pointer' }}>
              {taxLoading ? 'Calculating…' : 'Calculate sales tax'}
            </button>
            <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
              <button className={styles.cancelBtn} onClick={cancelDelivery}>Cancel</button>
              <button className={styles.confirmBtn} onClick={submitDelivery} disabled={submitting}>
                {submitting ? <span className="spin" /> : 'Confirm Delivery'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function RevealPage() {
  return <Suspense><RevealContent /></Suspense>
}
