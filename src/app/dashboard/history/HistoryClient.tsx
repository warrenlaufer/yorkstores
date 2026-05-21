'use client'
import { useState } from 'react'
import styles from './history.module.css'

type Purchase = {
  id: string
  itemName: string
  itemPrice: number
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

const outcomeLabel: Record<string, string> = {
  DELIVERY: '📦 Delivery',
  SOLD_BACK: '💸 Sold Back',
  AUTO_SOLD: '⏰ Auto Sold',
  AUTO_FAILED: '⚠️ Auto-failed',
}

type ListRow = {
  id: string
  date: string
  itemName: string
  dropName: string
  action: string
  actionClass: string
  balanceBefore: number
  balanceAfter: number
}

export default function HistoryClient({ purchases, stats }: { purchases: Purchase[]; stats: Stats }) {
  const [view, setView] = useState<'icons' | 'list'>('icons')

  // Build flat list of events — each purchase becomes 1 or 2 rows
  const listRows: ListRow[] = []
  purchases.forEach(p => {
    // Row 1: the purchase itself
    const purchaseBalanceBefore = p.balanceBefore
    const purchaseBalanceAfter = purchaseBalanceBefore - p.pricePaid

    listRows.push({
      id: p.id + '_buy',
      date: new Date(p.createdAt).toLocaleDateString(),
      itemName: p.itemName,
      dropName: p.dropName,
      action: 'Bought',
      actionClass: 'outcome_AUTO_FAILED',
      balanceBefore: purchaseBalanceBefore,
      balanceAfter: purchaseBalanceAfter,
    })

    // Row 2: sell-back or delivery (if resolved)
    if (p.outcome === 'SOLD_BACK' || p.outcome === 'AUTO_SOLD') {
      listRows.push({
        id: p.id + '_sell',
        date: new Date(p.createdAt).toLocaleDateString(),
        itemName: p.itemName,
        dropName: p.dropName,
        action: p.outcome === 'AUTO_SOLD' ? 'Auto Sold Back' : 'Sold Back',
        actionClass: 'outcome_SOLD_BACK',
        balanceBefore: purchaseBalanceAfter,
        balanceAfter: purchaseBalanceAfter + p.refundAmt,
      })
    } else if (p.outcome === 'DELIVERY') {
      listRows.push({
        id: p.id + '_del',
        date: new Date(p.createdAt).toLocaleDateString(),
        itemName: p.itemName,
        dropName: p.dropName,
        action: 'Delivery',
        actionClass: 'outcome_DELIVERY',
        balanceBefore: purchaseBalanceAfter,
        balanceAfter: purchaseBalanceAfter,
      })
    }
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>History</h1>
          <p className={styles.sub}>All boxes you've opened and their outcomes.</p>
        </div>
        <div className={styles.toggleWrap}>
          <button
            className={`${styles.toggleBtn} ${view === 'icons' ? styles.toggleActive : ''}`}
            onClick={() => setView('icons')}
          >
            ⊞ Icons
          </button>
          <button
            className={`${styles.toggleBtn} ${view === 'list' ? styles.toggleActive : ''}`}
            onClick={() => setView('list')}
          >
            ≡ List
          </button>
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#7EC8FF'}}>{stats.deliveries}</div><div className={styles.statLbl}>Taking Delivery</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#5FFFA8'}}>${stats.soldBack.toFixed(2)}</div><div className={styles.statLbl}>Sold Back</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#FF6B85'}}>${stats.spent.toFixed(2)}</div><div className={styles.statLbl}>Total Spent</div></div>
      </div>

      {purchases.length === 0 ? (
        <div className={styles.empty}><div className={styles.emptyIcon}>📦</div><p>No boxes opened yet.</p></div>
      ) : view === 'icons' ? (
        <div className={styles.grid}>
          {purchases.map(p => (
            <div key={p.id} className={styles.card}>
              <div className={styles.cardImg}>
                {p.itemImageUrl
                  ? <img src={p.itemImageUrl} alt={p.itemName} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                  : p.dropEmoji}
              </div>
              <div className={styles.cardBody}>
                <div className={styles.cardName}>{p.itemName}</div>
                <div className={styles.cardFrom}>From: {p.dropName}</div>
                <div className={styles.cardPrice}>${p.itemPrice.toFixed(2)}</div>
                {p.outcome && (
                  <span className={`${styles.outcomeTag} ${styles['outcome_' + p.outcome]}`}>
                    {outcomeLabel[p.outcome] ?? p.outcome}
                  </span>
                )}
                {p.trackingNumber && <div className={styles.tracking}>🚚 {p.trackingNumber}</div>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Date</span>
            <span>Item</span>
            <span>Action</span>
            <span>Prev Balance</span>
            <span>New Balance</span>
          </div>
          {listRows.map(row => (
            <div key={row.id} className={styles.tableRow}>
              <span className={styles.cellMuted}>{row.date}</span>
              <span>
                <div className={styles.cellName}>{row.itemName}</div>
                <div className={styles.cellSub}>{row.dropName}</div>
              </span>
              <span>
                <span className={`${styles.outcomeTag} ${styles[row.actionClass]}`}>
                  {row.action}
                </span>
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