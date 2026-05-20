'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import styles from './reveal.module.css'

type PurchaseData = {
  purchaseId: string
  box: { itemName: string; itemPrice: number; itemShippingCost: number; itemImageUrl?: string }
  pricePaid: number
  newBalance: number
}

type AddressForm = {
  recipientName: string; recipientEmail: string; addressLine1: string; addressLine2: string
  city: string; state: string; postcode: string; country: string
}

function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    const colors = ['#FF6B85','#F5C842','#3DD68C','#60A5FA','#C084FC','#FB923C','#fff']
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * 100,
      w: 6 + Math.random() * 10, h: 4 + Math.random() * 6,
      color: colors[Math.floor(Math.random() * colors.length)],
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
        if (elapsed > 1500) p.opacity = Math.max(0, p.opacity - 0.012)
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot)
        ctx.globalAlpha = p.opacity; ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore()
      })
      if (elapsed < 3000) animRef.current = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    animRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animRef.current)
  }, [active])

  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999 }} />
}

function RevealContent() {
  const params = useSearchParams()
  const router = useRouter()
  const purchaseId = params.get('purchaseId')

  const [data, setData] = useState<PurchaseData | null>(null)
  const [phase, setPhase] = useState<'opening' | 'revealed' | 'done'>('opening')
  const [lidOpen, setLidOpen] = useState(false)
  const [cardVisible, setCardVisible] = useState(false)
  const [actionsVisible, setActionsVisible] = useState(false)
  const [showConfetti, setShowConfetti] = useState(false)
  const [countdown, setCountdown] = useState(300)
  const [showAddr, setShowAddr] = useState(false)
  const [addrForm, setAddrForm] = useState<AddressForm>({
    recipientName: '', recipientEmail: '', addressLine1: '', addressLine2: '',
    city: '', state: '', postcode: '', country: 'United States',
  })
  const [addrError, setAddrError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [outcome, setOutcome] = useState<'delivery' | 'soldback' | null>(null)
  const [outcomeMsg, setOutcomeMsg] = useState('')
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!purchaseId) { router.push('/dashboard'); return }
    fetch(`/api/orders?purchaseId=${purchaseId}`)
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data) {
          const p = d.data.find((x: any) => x.id === purchaseId)
          if (p) setData({
            purchaseId,
            box: { itemName: p.itemName, itemPrice: p.itemPrice, itemShippingCost: p.itemShippingCost, itemImageUrl: p.itemImageUrl },
            pricePaid: p.pricePaid, newBalance: 0,
          })
        }
      }).catch(() => {})

    setTimeout(() => setLidOpen(true), 500)
    setTimeout(() => setShowConfetti(true), 900)
    setTimeout(() => setCardVisible(true), 1700)
    setTimeout(() => {
      setActionsVisible(true)
      setPhase('revealed')
      router.refresh()
    }, 2200)
  }, [purchaseId])

  useEffect(() => {
    if (phase !== 'revealed' || outcome) return
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); handleAutoSell(); return 0 }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [phase, outcome])

  function stopTimer() { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }

  async function handleSellBack() {
    stopTimer(); setSubmitting(true)
    const res = await fetch('/api/orders/sellback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setOutcome('soldback')
      setOutcomeMsg(`💸 Sold for $${d.data.refundAmount.toFixed(2)} — added to your wallet.`)
      router.refresh()
    } else setOutcomeMsg(d.error)
  }

  async function handleAutoSell() {
    const res = await fetch('/api/orders/sellback', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId }),
    })
    const d = await res.json()
    if (res.ok) {
      setOutcome('soldback')
      setOutcomeMsg(`⏰ Time expired — auto sold back for $${d.data.refundAmount.toFixed(2)}.`)
      router.refresh()
    } else setOutcomeMsg('⏰ Time expired — auto sell-back failed.')
    setActionsVisible(false)
  }

  function openDelivery() { stopTimer(); setShowAddr(true) }
  function cancelDelivery() { setShowAddr(false) }

  async function submitDelivery() {
    setAddrError('')
    if (!addrForm.recipientName || !addrForm.recipientEmail || !addrForm.addressLine1 || !addrForm.city || !addrForm.postcode) {
      setAddrError('Please fill in all required fields.'); return
    }
    setSubmitting(true)
    const res = await fetch('/api/orders', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchaseId, ...addrForm }),
    })
    const d = await res.json()
    setSubmitting(false)
    if (res.ok) {
      setShowAddr(false)
      setOutcome('delivery')
      setOutcomeMsg(`📦 Delivery confirmed! We'll ship to ${addrForm.recipientName}, ${addrForm.city}.`)
      router.refresh()
    } else setAddrError(d.error)
  }

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60
  const pct = (countdown / 300) * 100
  const barColor = countdown <= 60 ? '#ff3355' : countdown <= 120 ? '#FF8C00' : '#FF6B85'
  const urgent = countdown <= 30

  if (!purchaseId) return null

  return (
    <div className={styles.screen}>
      <Confetti active={showConfetti} />

      <div className={styles.boxArea}>
        <div className={styles.boxWrap}>
          <svg className={styles.boxSvg} viewBox="0 0 140 140" fill="none">
            <rect x="16" y="68" width="108" height="64" rx="6" fill="#1a0810" stroke="#FF6B85" strokeWidth="1.5"/>
            <polygon points="16,68 7,61 7,124 16,132" fill="#140610" opacity="0.8"/>
            <polygon points="124,68 133,61 133,124 124,132" fill="#140610" opacity="0.5"/>
            <rect x="16" y="94" width="108" height="8" fill="#FF6B85" opacity="0.4"/>
            <rect x="64" y="68" width="12" height="64" fill="#FF6B85" opacity="0.4"/>
            <g className={lidOpen ? styles.lidOpen : styles.lid}>
              <rect x="11" y="53" width="118" height="19" rx="5" fill="#230c18" stroke="#FF8FA3" strokeWidth="1.5"/>
              <rect x="64" y="53" width="12" height="19" fill="#FF8FA3" opacity="0.5"/>
              <ellipse cx="59" cy="54" rx="11" ry="7.5" fill="#FFAABB" transform="rotate(-30 59 54)"/>
              <ellipse cx="81" cy="54" rx="11" ry="7.5" fill="#FFAABB" transform="rotate(30 81 54)"/>
              <ellipse cx="70" cy="54" rx="5.5" ry="5" fill="#FF6B85"/>
              <ellipse cx="70" cy="53" rx="3" ry="2.8" fill="#CC3050"/>
            </g>
          </svg>
        </div>
      </div>

      {data && (
        <div className={`${styles.revealCard} ${cardVisible ? styles.revealCardVisible : ''}`}>
          {data.box.itemImageUrl && (
            <div className={styles.itemImageWrap}>
              <img src={data.box.itemImageUrl} alt={data.box.itemName} className={styles.itemImage} />
            </div>
          )}

          <div className={styles.revealBody}>
            <div className={styles.revealLabel}>✦ You revealed</div>
            <div className={styles.revealName}>{data.box.itemName}</div>
            <div className={styles.revealVal}>
              ${data.box.itemPrice.toFixed(2)} value
              {data.box.itemShippingCost > 0 ? ` · $${data.box.itemShippingCost.toFixed(2)} shipping` : ''}
            </div>

            {!outcome && (
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
                <button className={styles.deliveryBtn} onClick={openDelivery} disabled={submitting}>📦 Take Delivery</button>
                <button className={styles.sellBtn} onClick={handleSellBack} disabled={submitting}>
                  {submitting ? <span className="spin" /> : `💸 Sell Back for $${(data.box.itemPrice * 0.9).toFixed(2)}`}
                </button>
              </div>
            )}

            {outcome && (
              <div className={`${styles.outcomeMsg} ${outcome === 'delivery' ? styles.outcomeDel : styles.outcomeSold}`}>
                {outcomeMsg}
              </div>
            )}

            {outcome && (
              <button className={styles.backBtn} onClick={() => router.push('/dashboard')}>Back to Drops</button>
            )}
          </div>
        </div>
      )}

      {showAddr && (
        <div className={styles.addrOverlay} onClick={cancelDelivery}>
          <div className={styles.addrBox} onClick={e => e.stopPropagation()}>
            <h2 className={styles.addrTitle}>📦 Shipping Address</h2>
            <p className={styles.addrSub}>
              Shipping cost: {data?.box.itemShippingCost ? `$${data.box.itemShippingCost.toFixed(2)} (charged separately)` : 'Free'}
            </p>
            {addrError && <div className={styles.addrErr}>{addrError}</div>}
            <div className="field"><label>Full Name</label><input value={addrForm.recipientName} onChange={e => setAddrForm(p => ({...p, recipientName: e.target.value}))} /></div>
            <div className="field"><label>Email (for tracking)</label><input type="email" value={addrForm.recipientEmail} onChange={e => setAddrForm(p => ({...p, recipientEmail: e.target.value}))} /></div>
            <div className="field"><label>Address Line 1</label><input value={addrForm.addressLine1} onChange={e => setAddrForm(p => ({...p, addressLine1: e.target.value}))} /></div>
            <div className="field"><label>Address Line 2 (optional)</label><input value={addrForm.addressLine2} onChange={e => setAddrForm(p => ({...p, addressLine2: e.target.value}))} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}>
              <div className="field"><label>City</label><input value={addrForm.city} onChange={e => setAddrForm(p => ({...p, city: e.target.value}))} /></div>
              <div className="field"><label>State / County</label><input value={addrForm.state} onChange={e => setAddrForm(p => ({...p, state: e.target.value}))} /></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0.6rem'}}>
              <div className="field"><label>Postcode / ZIP</label><input value={addrForm.postcode} onChange={e => setAddrForm(p => ({...p, postcode: e.target.value}))} /></div>
              <div className="field"><label>Country</label><input value={addrForm.country} onChange={e => setAddrForm(p => ({...p, country: e.target.value}))} /></div>
            </div>
            <div style={{display:'flex',gap:'0.6rem',marginTop:'0.75rem'}}>
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