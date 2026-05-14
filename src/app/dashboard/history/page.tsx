import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import styles from './history.module.css'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const user = await getSession()
  if (!user) redirect('/signin')

  const purchases = await prisma.purchase.findMany({
    where: { buyerId: user.id },
    include: {
      box: { include: { drop: { select: { name: true, emoji: true } } } },
      order: { select: { status: true, trackingNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const deliveries = purchases.filter(p => p.outcome === 'DELIVERY').length
  const soldBack = purchases.filter(p => p.outcome === 'SOLD_BACK' || p.outcome === 'AUTO_SOLD').reduce((s, p) => s + Number(p.refundAmt), 0)
  const spent = purchases.reduce((s, p) => s + Number(p.pricePaid), 0)

  const outcomeLabel: Record<string, string> = {
    DELIVERY: '📦 Delivery',
    SOLD_BACK: '💸 Sold Back',
    AUTO_SOLD: '⏰ Auto Sold',
    AUTO_FAILED: '⚠️ Auto-failed',
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <p className={styles.sub}>All boxes you've opened and their outcomes.</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#7EC8FF'}}>{deliveries}</div><div className={styles.statLbl}>Taking Delivery</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#5FFFA8'}}>${soldBack.toFixed(2)}</div><div className={styles.statLbl}>Sold Back</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#FF6B85'}}>${spent.toFixed(2)}</div><div className={styles.statLbl}>Total Spent</div></div>
      </div>

      {purchases.length === 0 ? (
        <div className={styles.empty}><div className={styles.emptyIcon}>📦</div><p>No boxes opened yet.</p></div>
      ) : (
        <div className={styles.grid}>
          {purchases.map(p => (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardImg}>{p.box.itemImageUrl ? <img src={p.box.itemImageUrl} alt={p.box.itemName} style={{width:'100%',height:'100%',objectFit:'cover'}} /> : p.box.drop.emoji}</div>
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{p.box.itemName}</div>
                <div className={styles.cardFrom}>From: {p.box.drop.name}</div>
                <div className={styles.cardPrice}>${Number(p.box.itemPrice).toFixed(2)}</div>
                {p.outcome && <span className={`${styles.outcomeTag} ${styles['outcome_' + p.outcome]}`}>{outcomeLabel[p.outcome] ?? p.outcome}</span>}
                {p.order?.trackingNumber && <div className={styles.tracking}>🚚 {p.order.trackingNumber}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
