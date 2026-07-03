import { BarChart3, Wallet } from 'lucide-react'
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
      type: { in: ['sale', 'buyback', 'shipping_credit'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  function getGross(t: { type: string; amount: unknown }) {
    const amt = Math.abs(Number(t.amount))
    if (t.type === 'sale') return Math.round((amt / 0.95) * 100) / 100
    if (t.type === 'buyback') return amt
    if (t.type === 'shipping_credit') return Math.round((amt / 0.95) * 100) / 100
    return amt
  }

  function getFee(t: { type: string; amount: unknown }) {
    const gross = getGross(t)
    if (t.type === 'sale' || t.type === 'shipping_credit') return Math.round(gross * 0.05 * 100) / 100
    return 0
  }

  const saleTxs = transactions.filter(t => t.type === 'sale')
  const buybackTxs = transactions.filter(t => t.type === 'buyback')
  const shippingTxs = transactions.filter(t => t.type === 'shipping_credit')

  const totalGrossSales = saleTxs.reduce((s, t) => s + getGross(t), 0)
  const totalGrossBuybacks = buybackTxs.reduce((s, t) => s + getGross(t), 0)
  const totalGrossShipping = shippingTxs.reduce((s, t) => s + getGross(t), 0)
  const totalPlatformFees = transactions.reduce((s, t) => s + getFee(t), 0)
  const netRevenue = saleTxs.reduce((s, t) => s + Number(t.amount), 0)
    - totalGrossBuybacks
    + shippingTxs.reduce((s, t) => s + Number(t.amount), 0)

  function getTypeLabel(type: string) {
    if (type === 'sale') return 'Sale'
    if (type === 'buyback') return 'Buyback'
    if (type === 'shipping_credit') return 'Shipping'
    return type
  }

  function getTypeCls(type: string) {
    if (type === 'sale') return styles.badgeSale
    if (type === 'buyback') return styles.badgeBuyback
    if (type === 'shipping_credit') return styles.badgeShipping
    return styles.badgeOther
  }

  // Store wallet topups (withdrawals to bank not yet implemented)
  const walletTxs = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      type: { in: ['sale', 'buyback', 'shipping_credit', 'withdrawal'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <div className={styles.wrap}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <Link href="/dashboard/store" className={styles.back}>← Back to Store</Link>
        <a href="/api/export/store" className={styles.exportBtn}>⬇ Download CSV</a>
      </div>

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
          <div className={styles.statVal} style={{color:'#7EC8FF'}}>${totalGrossShipping.toFixed(2)}</div>
          <div className={styles.statLbl}>Gross Shipping</div>
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

      {/* Sales/Buybacks/Shipping table */}
      <div className={styles.sectionLabel}>Sales & Buybacks</div>
      {transactions.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><BarChart3 size={30} strokeWidth={1.4} /></div>
          <p>No store transactions yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap} style={{marginBottom:'2rem'}}>
          <div className={styles.tableHead}>
            <span>Date</span>
            <span>Description</span>
            <span>Type</span>
            <span>Gross</span>
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
                  <span className={`${styles.badge} ${getTypeCls(t.type)}`}>{getTypeLabel(t.type)}</span>
                </span>
                <span className={styles.cellMono}>${gross.toFixed(2)}</span>
                <span className={`${styles.cellMono} ${fee > 0 ? styles.amtNeg : ''}`}>
                  {fee > 0 ? `−$${fee.toFixed(2)}` : '—'}
                </span>
                <span className={`${styles.cellMono} ${isNeg ? styles.amtNeg : styles.amtPos}`}>
                  {isNeg ? '−' : '+'}${Math.abs(net).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Store wallet history */}
      <div className={styles.sectionLabel}>Store Wallet History</div>
      {walletTxs.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Wallet size={30} strokeWidth={1.4} /></div>
          <p>No wallet activity yet.</p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead} style={{gridTemplateColumns:'120px 1fr 100px 90px'}}>
            <span>Date</span>
            <span>Description</span>
            <span>Type</span>
            <span>Amount</span>
          </div>
          {walletTxs.map(t => {
            const amt = Number(t.amount)
            const isPos = amt > 0
            return (
              <div key={t.id} className={styles.tableRow} style={{gridTemplateColumns:'120px 1fr 100px 90px'}}>
                <span className={styles.cellMuted}>
                  {new Date(t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <span className={styles.cellDesc}>{t.description}</span>
                <span>
                  <span className={`${styles.badge} ${getTypeCls(t.type)}`}>{getTypeLabel(t.type)}</span>
                </span>
                <span className={`${styles.cellMono} ${isPos ? styles.amtPos : styles.amtNeg}`}>
                  {isPos ? '+' : '−'}${Math.abs(amt).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}