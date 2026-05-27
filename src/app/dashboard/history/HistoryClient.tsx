'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './history.module.css'

type Purchase = {
  id: string
  itemName: string
  itemPrice: number
  itemShippingCost: number
  itemImageUrl: string | null
  dropName: string
  dropEmoji: string
  dropLogoUrl: string | null
  pricePaid: number
  refundAmt: number
  outcome: string | null
  trackingNumber: string | null
  orderStatus: string | null
  createdAt: string
  balanceBefore: number
  balanceAfter: number
}

type Stats = { deliveries: number; soldBack: number; spent: number }

type ListRow = {
  id: string
  purchaseId: string
  date: string
  itemName: string
  dropName: string
  itemImageUrl: string | null
  action: string
  actionClass: string
  balanceBefore: number
  balanceAfter: number
  filterType: 'purchase' | 'soldback' | 'shipped'
}

export default function HistoryClient({ purchases, stats }: { purchases: Purchase[]; stats: Stats }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'purchase' | 'soldback' | 'shipped'>('all')
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  const listRows: ListRow[] = []
  purchases.forEach(p => {
    const purchaseBalanceBefore = p.balanceBefore
    const purchaseBalanceAfter = purchaseBalanceBefore - p.pricePaid

    if (p.outcome === 'SOLD_BACK' || p.outcome === 'AUTO_SOLD') {
      listRows.push({
        id: p.id + '_sell',
        purchaseId: p.id,
        date: new Date(p.createdAt).toLocaleDateString(),
        itemName: p.itemName,
        dropName: p.dropName,
        itemImageUrl: p.itemImageUrl,
        action: p.outcome === 'AUTO_SOLD' ? 'Auto Sold Back' : 'Sold Back',
        actionClass: 'outcome_SOLD_BACK',
        balanceBefore: purchaseBalanceAfter,
        balanceAfter: purchaseBalanceAfter + p.refundAmt,
        filterType: 'soldback',
      })
    } else if (p.outcome === 'DELIVERY') {
      listRows.push({
        id: p.id + '_del',
        purchaseId: p.id,
        date: new Date(p.createdAt).toLocaleDateString(),
        itemName: p.itemName,
        dropName: p.dropName,
        itemImageUrl: p.itemImageUrl,
        action: 'Shipped',
        actionClass: 'outcome_DELIVERY',
        balanceBefore: purchaseBalanceAfter,
        balanceAfter: purchaseBalanceAfter - p.itemShippingCost,
        filterType: 'shipped',
      })
    }

    listRows.push({
      id: p.id + '_buy',
      purchaseId: p.id,
      date: new Date(p.createdAt).toLocaleDateString(),
      itemName: p.itemName,
      dropName: p.dropName,
      itemImageUrl: p.itemImageUrl,
      action: 'Bought',
      actionClass: 'outcome_BUY',
      balanceBefore: purchaseBalanceBefore,
      balanceAfter: purchaseBalanceAfter,
      filterType: 'purchase',
    })
  })

  const filtered = filter === 'all' ? listRows : listRows.filter(r => r.filterType === filter)

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>History</h1>
          <p className={styles.sub}>All boxes you've opened and their outcomes.</p>
        </div>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={e => setFilter(e.target.value as any)}
        >
          <option value="all">All Activity</option>
          <option value="purchase">Purchases</option>
          <option value="soldback">Sold Back</option>
          <option value="shipped">Shipped</option>
        </select>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#7EC8FF'}}>{stats.deliveries}</div><div className={styles.statLbl}>Taking Delivery</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#5FFFA8'}}>${stats.soldBack.toFixed(2)}</div><div className={styles.statLbl}>Sold Back</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#FF6B85'}}>${stats.spent.toFixed(2)}</div><div className={styles.statLbl}>Total Spent</div></div>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}><div className={styles.emptyIcon}>📦</div><p>No activity yet.</p></div>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span></span>
            <span>Date</span>
            <span>Item</span>
            <span>Action</span>
            <span>Prev Balance</span>
            <span>New Balance</span>
          </div>
          {filtered.map(row => (
            <div
              key={row.id}
              className={`${styles.tableRow} ${hoveredRow === row.id ? styles.tableRowHovered : ''}`}
              onMouseEnter={() => setHoveredRow(row.id)}
              onMouseLeave={() => setHoveredRow(null)}
              onClick={() => router.push(`/dashboard/history/${row.purchaseId}`)}
            >
              <span className={styles.cellThumb}>
                {row.itemImageUrl
                  ? <img src={row.itemImageUrl} alt={row.itemName} className={styles.thumbImg} />
                  : <span className={styles.thumbEmoji}>🎁</span>}
              </span>
              <span className={styles.cellMuted}>{row.date}</span>
              <span>
                <div className={styles.cellName}>{row.itemName}</div>
                <div className={styles.cellSub}>{row.dropName}</div>
              </span>
              <span>
                <span className={`${styles.outcomeTag} ${styles[row.actionClass]}`}>{row.action}</span>
              </span>
              <span className={styles.cellMono}>${row.balanceBefore.toFixed(2)}</span>
              <span className={styles.cellMono} style={{color: row.balanceAfter >= row.balanceBefore ? '#5FFFA8' : '#FF8FA3'}}>
                ${row.balanceAfter.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}