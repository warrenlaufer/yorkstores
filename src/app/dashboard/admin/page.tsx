import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import styles from './admin.module.css'
import PromoClient from './PromoClient'
import WithdrawalsClient from './WithdrawalsClient'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) redirect('/dashboard')

  const [userCount, dropCount, purchaseCount, revenue, platformByType, storeDebt, recentPurchases, users, recentPlatformTx, promoCodes, withdrawals] = await Promise.all([
    prisma.user.count(),
    prisma.drop.count(),
    prisma.purchase.count(),
    prisma.purchase.aggregate({ _sum: { pricePaid: true } }),
    prisma.platformTransaction.groupBy({ by: ['type'], _sum: { amount: true } }),
    prisma.user.aggregate({ where: { storeBalance: { lt: 0 } }, _sum: { storeBalance: true } }),
    prisma.purchase.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { name: true, email: true } },
        box: { include: { drop: { select: { name: true } } } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, name: true, email: true, role: true, company: true, walletBalance: true, storeBalance: true, createdAt: true, _count: { select: { purchases: true, drops: true } } },
    }),
    prisma.platformTransaction.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: { drop: { select: { name: true } } },
    }),
    prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.withdrawal.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { user: { select: { name: true, email: true, role: true, company: true, payoutsEnabled: true, stripeAccountId: true } } },
    }),
  ])

  const totalRevenue = Number(revenue._sum.pricePaid ?? 0)
  const sumByType = (t: string) => Number(platformByType.find(r => r.type === t)?._sum.amount ?? 0)
  const feeRevenue = sumByType('platform_fee') + sumByType('platform_fee_shipping')
  const salesTaxCollected = sumByType('sales_tax')
  const advancesOutstanding = -Number(storeDebt._sum.storeBalance ?? 0)

  return (
    <div className={styles.wrap}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1.25rem'}}>
        <div className={styles.header}>
          <h1 className={styles.title}>Admin Dashboard</h1>
          <p className={styles.sub}>Platform overview and user management.</p>
        </div>
        <a href="/api/export/admin" className={styles.exportBtn}>⬇ Download CSV</a>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statVal}>{userCount}</div><div className={styles.statLbl}>Total Users</div></div>
        <div className={styles.statCard}><div className={styles.statVal}>{dropCount}</div><div className={styles.statLbl}>Total Drops</div></div>
        <div className={styles.statCard}><div className={styles.statVal}>{purchaseCount}</div><div className={styles.statLbl}>Total Purchases</div></div>
        <div className={styles.statCard}><div className={styles.statVal} style={{color:'#F5C842'}}>${totalRevenue.toFixed(2)}</div><div className={styles.statLbl}>Gross Revenue</div></div>
        <div className={styles.statCard}><div className={styles.statVal} style={{color:'var(--green)'}}>${feeRevenue.toFixed(2)}</div><div className={styles.statLbl}>Fee Revenue</div></div>
        <div className={styles.statCard}><div className={styles.statVal} style={{color: advancesOutstanding > 0 ? '#FF8FA3' : 'var(--text)'}}>${advancesOutstanding.toFixed(2)}</div><div className={styles.statLbl}>Advances Outstanding</div></div>
        <div className={styles.statCard}><div className={styles.statVal} style={{color:'var(--text2)'}}>${salesTaxCollected.toFixed(2)}</div><div className={styles.statLbl}>Sales Tax (to remit)</div></div>
      </div>

      <div className={styles.section}>Platform Revenue</div>
      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Date</span><span>Description</span><span>Drop</span><span>Type</span><span>Amount</span>
        </div>
        {recentPlatformTx.map(t => (
          <div key={t.id} className={styles.tableRow}>
            <span className={styles.cellMuted}>{new Date(t.createdAt).toLocaleDateString()}</span>
            <span>{t.description}</span>
            <span className={styles.cellMuted}>{t.drop?.name ?? '—'}</span>
            <span><span className={styles.roleBadge}>{t.type.replace(/_/g, ' ')}</span></span>
            <span style={{fontFamily:'var(--mono)',color: Number(t.amount) < 0 ? '#FF8FA3' : 'var(--green)'}}>{Number(t.amount) < 0 ? '-' : '+'}${Math.abs(Number(t.amount)).toFixed(2)}</span>
          </div>
        ))}
        {recentPlatformTx.length === 0 && (
          <div className={styles.tableRow}><span className={styles.cellMuted} style={{gridColumn:'1/-1'}}>No platform transactions yet.</span></div>
        )}
      </div>

      <div className={styles.section} style={{marginTop:'2rem'}}>Recent Purchases</div>
      <div className={styles.table}>
        <div className={styles.tableHead}>
          <span>Buyer</span><span>Item</span><span>Drop</span><span>Amount</span><span>Outcome</span><span>Date</span>
        </div>
        {recentPurchases.map(p => (
          <div key={p.id} className={styles.tableRow}>
            <span className={styles.cellMuted}>{p.buyer.name}</span>
            <span>{p.box.itemName}</span>
            <span className={styles.cellMuted}>{p.box.drop.name}</span>
            <span style={{fontFamily:'var(--mono)',color:'var(--gold)'}}>${Number(p.pricePaid).toFixed(2)}</span>
            <span><span className={`${styles.outcomeBadge} ${p.outcome ? styles['outcome_' + p.outcome] : styles.outcome_pending}`}>{p.outcome?.toLowerCase().replace('_', ' ') ?? 'pending'}</span></span>
            <span className={styles.cellMuted}>{new Date(p.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      <div className={styles.section} style={{marginTop:'2rem'}}>Users</div>
      <div className={styles.table}>
        <div className={styles.tableHead} style={{ gridTemplateColumns: '1.2fr 1.4fr 90px 80px 90px 70px 80px' }}>
          <span>Name</span><span>Email</span><span>Role</span><span>Wallet</span><span>Store Bal.</span><span>Purchases</span><span>Joined</span>
        </div>
        {users.map(u => (
          <div key={u.id} className={styles.tableRow} style={{ gridTemplateColumns: '1.2fr 1.4fr 90px 80px 90px 70px 80px' }}>
            <span>{u.name}{u.company ? <span className={styles.cellMuted}> · {u.company}</span> : ''}</span>
            <span className={styles.cellMuted}>{u.email}</span>
            <span><span className={`${styles.roleBadge} ${styles['role_' + u.role]}`}>{u.role.toLowerCase().replace('_', ' ')}</span></span>
            <span style={{fontFamily:'var(--mono)'}}>${Number(u.walletBalance).toFixed(2)}</span>
            <span style={{ fontFamily: 'var(--mono)', color: u.role === Role.STORE_OWNER ? 'var(--gold)' : 'var(--text3)' }}>
              {u.role === Role.STORE_OWNER ? `$${Number(u.storeBalance).toFixed(2)}` : '—'}
            </span>
            <span className={styles.cellMuted}>{u._count.purchases}</span>
            <span className={styles.cellMuted}>{new Date(u.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      <div className={styles.section} style={{marginTop:'2rem'}}>Promo Codes</div>
      <PromoClient initial={promoCodes.map(c => ({
        id: c.id,
        code: c.code,
        type: c.type,
        amount: Number(c.amount),
        matchPct: c.matchPct,
        description: c.description,
        maxUses: c.maxUses,
        usedCount: c.usedCount,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
      }))} />

      <div className={styles.section} style={{marginTop:'2rem'}}>Withdrawals</div>
      <WithdrawalsClient initial={withdrawals.map(w => ({
        id: w.id,
        source: w.source,
        amount: Number(w.amount),
        status: w.status,
        createdAt: w.createdAt.toISOString(),
        user: { name: w.user.name, email: w.user.email, role: w.user.role, company: w.user.company, payoutsReady: !!(w.user.payoutsEnabled && w.user.stripeAccountId) },
      }))} />

    </div>
  )
}