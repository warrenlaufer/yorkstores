import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import Link from 'next/link'
import styles from './storeHistory.module.css'

export const dynamic = 'force-dynamic'

export default async function StoreHistoryPage() {
  const user = await getSession()
  if (!user) redirect('/signin')
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) redirect('/dashboard')

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      type: { in: ['sale', 'buyback'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  function getGross(t: { type: string; amount: unknown }) {
    const amt = Math.abs(Number(t.amount))
    if (t.type === 'sale') return Math.round((amt / 0.95) * 100) / 100
    if (t.type === 'buyback') return amt
    return amt
  }

  function getFee(t: { type: string; amount: unknown }) {
    return Math.round(getGross(t) * 0.05 * 100) / 100
  }

  const saleTxs = transactions.filter(t => t.type === 'sale')
  const buybackTxs = transactions.filter(t => t.type === 'buyback')

  const totalGrossSales = saleTxs.reduce((s, t) => s + getGross(t), 0)
  const totalGrossBuybacks = buybackTxs.reduce((s, t) => s + getGross(t), 0)
  const totalPlatformFees = transactions.reduce((s, t) => s + getFee(t), 0)
  const netRevenue = saleTxs.reduce((s, t) => s + Number(t.amount), 0) - totalGrossBuybacks

  return (
    <div className={styles.wrap}>
      <Link href="/dashboard/store" className={styles.back}>← Back to Store</Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Store History</h1>
        <p className={styles.sub}>All transactions for your store.</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'#3DD68C'}}>${totalGrossSales.toFixed(2)}</div>
          <div className={styles.statLbl}>Gross Sales</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'#FF8FA3'}}>${totalGrossBuybacks.toFixed(2)}</div>
          <div className={styles.statLbl}>Total Buybacks</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'#FF6B85'}}>${totalPlatformFees.toFixed(2)}</div>
          <div className={styles.statLbl}>Platform Fees (5%)</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'#F5C842'}}>${netRevenue.toFixed(2)}</div>
          <div className={styles.statLbl}>Net Revenue</div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📊</div>
          <p>No store transactions yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Date</span>
            <span>Description</span>
            <span>Type</span>
            <span>Price</span>
            <span>Platform Fee</span>
            <span>Net</span>
          </div>
          {transactions.map(t => {
            const gross = getGross(t)
            const fee = getFee(t)
            const net = Number(t.amount)
            const isNeg = net < 0
            return (
              <div key={t.id} className={styles.tableRow}>
                <span className={styles.cellMuted}>
                  {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={styles.cellDesc}>{t.description}</span>
                <span>
                  <span className={`${styles.badge} ${
                    t.type === 'sale' ? styles.badgeSale :
                    t.type === 'buyback' ? styles.badgeBuyback :
                    styles.badgeOther
                  }`}>
                    {t.type === 'sale' ? 'Sale' : t.type === 'buyback' ? 'Buyback' : t.type}
                  </span>
                </span>
                <span className={styles.cellMono}>${gross.toFixed(2)}</span>
                <span className={`${styles.cellMono} ${styles.amtNeg}`}>−${fee.toFixed(2)}</span>
                <span className={`${styles.cellMono} ${isNeg ? styles.amtNeg : styles.amtPos}`}>
                  {isNeg ? '−' : '+'}${Math.abs(net).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}