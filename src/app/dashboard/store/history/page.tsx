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
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  const totalSales = transactions.filter(t => t.type === 'sale').reduce((s, t) => s + Number(t.amount), 0)
  const totalBuybacks = transactions.filter(t => t.type === 'buyback').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div className={styles.wrap}>
      <Link href="/dashboard/store" className={styles.back}>← Back to Store</Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Store History</h1>
        <p className={styles.sub}>All transactions for your store.</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'#3DD68C'}}>${totalSales.toFixed(2)}</div>
          <div className={styles.statLbl}>Total Sales</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'#FF8FA3'}}>${Math.abs(totalBuybacks).toFixed(2)}</div>
          <div className={styles.statLbl}>Total Buybacks</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statVal} style={{color:'#F5C842'}}>${(totalSales + totalBuybacks).toFixed(2)}</div>
          <div className={styles.statLbl}>Net Revenue</div>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📊</div>
          <p>No transactions yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Date</span>
            <span>Description</span>
            <span>Type</span>
            <span>Amount</span>
          </div>
          {transactions.map(t => (
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
              <span className={`${styles.cellAmount} ${Number(t.amount) >= 0 ? styles.amtPos : styles.amtNeg}`}>
                {Number(t.amount) >= 0 ? '+' : ''}${Math.abs(Number(t.amount)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}