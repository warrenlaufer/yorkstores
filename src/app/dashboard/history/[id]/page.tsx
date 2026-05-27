import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import styles from './activity.module.css'

export const dynamic = 'force-dynamic'

export default async function ActivityPage({ params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) redirect('/signin')

  const purchase = await prisma.purchase.findUnique({
    where: { id: params.id },
    include: {
      box: { include: { drop: { select: { name: true, emoji: true, logoUrl: true } } } },
      order: true,
    },
  })

  if (!purchase || purchase.buyerId !== user.id) notFound()

  const box = purchase.box
  const drop = box.drop
  const outcome = purchase.outcome
  const pricePaid = Number(purchase.pricePaid)
  const refundAmt = Number(purchase.refundAmt)
  const itemPrice = Number(box.itemPrice)
  const itemShipping = Number(box.itemShippingCost)

  const events: { type: string; label: string; date: Date; amount: number; note: string }[] = []

  events.push({
    type: 'purchase',
    label: 'Box Opened',
    date: purchase.createdAt,
    amount: -pricePaid,
    note: `Paid $${pricePaid.toFixed(2)} from wallet`,
  })

  if (outcome === 'SOLD_BACK' || outcome === 'AUTO_SOLD') {
    events.push({
      type: 'soldback',
      label: outcome === 'AUTO_SOLD' ? 'Auto Sold Back' : 'Sold Back',
      date: purchase.resolvedAt ?? purchase.createdAt,
      amount: refundAmt,
      note: `$${refundAmt.toFixed(2)} credited to wallet`,
    })
  }

  if (outcome === 'DELIVERY' && purchase.order) {
    events.push({
      type: 'delivery',
      label: 'Delivery Requested',
      date: purchase.resolvedAt ?? purchase.createdAt,
      amount: itemShipping > 0 ? -itemShipping : 0,
      note: itemShipping > 0 ? `$${itemShipping.toFixed(2)} shipping charged` : 'Free shipping',
    })
    if (purchase.order.trackingNumber) {
      events.push({
        type: 'shipped',
        label: 'Tracking Number Added',
        date: purchase.order.updatedAt,
        amount: 0,
        note: `Tracking: ${purchase.order.trackingNumber}`,
      })
      events.push({
        type: 'shipped',
        label: 'Shipped',
        date: purchase.order.updatedAt,
        amount: 0,
        note: `Your item is on its way`,
      })
    }
  }

  return (
    <div className={styles.wrap}>
      <Link href="/dashboard/history" className={styles.back}>← Back to History</Link>

      <div className={styles.card}>
        {box.itemImageUrl ? (
          <div className={styles.imgWrap}>
            <img src={box.itemImageUrl} alt={box.itemName} className={styles.img} />
          </div>
        ) : (
          <div className={styles.imgPlaceholder}>
            <span style={{fontSize:'4rem'}}>{drop.emoji || '🎁'}</span>
          </div>
        )}

        <div className={styles.info}>
          <div className={styles.dropName}>{drop.name}</div>
          <h1 className={styles.itemName}>{box.itemName}</h1>
          <div className={styles.itemPrice}>${itemPrice.toFixed(2)} value</div>

          {outcome && (
            <span className={`${styles.badge} ${
              outcome === 'DELIVERY' ? styles.badgeDel :
              outcome === 'SOLD_BACK' || outcome === 'AUTO_SOLD' ? styles.badgeSold :
              styles.badgePending
            }`}>
              {outcome === 'DELIVERY' ? '📦 Delivery' :
               outcome === 'SOLD_BACK' ? '💸 Sold Back' :
               outcome === 'AUTO_SOLD' ? '⏰ Auto Sold Back' : '⏳ Pending'}
            </span>
          )}
        </div>
      </div>

      <div className={styles.timeline}>
        <div className={styles.timelineTitle}>Activity</div>
        {events.map((e, i) => (
          <div key={i} className={styles.event}>
            <div className={`${styles.eventDot} ${
              e.type === 'purchase' ? styles.dotPurchase :
              e.type === 'soldback' ? styles.dotSold :
              e.type === 'delivery' ? styles.dotDelivery :
              styles.dotShipped
            }`} />
            {i < events.length - 1 && <div className={styles.eventLine} />}
            <div className={styles.eventContent}>
              <div className={styles.eventLabel}>{e.label}</div>
              <div className={styles.eventNote}>{e.note}</div>
              <div className={styles.eventDate}>
                {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
            {e.amount !== 0 && (
              <div className={`${styles.eventAmount} ${e.amount > 0 ? styles.amtPos : styles.amtNeg}`}>
                {e.amount > 0 ? '+' : ''}${Math.abs(e.amount).toFixed(2)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}