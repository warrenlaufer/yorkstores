'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './history.module.css'
import { Package, Gift, CreditCard } from 'lucide-react'

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

type WalletTx = {
  id: string
  type: string
  description: string
  amount: number
  createdAt: string
}

type Stats = { deliveries: number; soldBack: number; spent: number; deposited: number }

type ListRow = {
  id: string
  purchaseId: string | null
  date: string
  itemName: string
  subName: string
  itemImageUrl: string | null
  action: string
  actionClass: string
  amount: number
  amountSign: '+' | '-'
  filterType: 'purchase' | 'soldback' | 'shipped' | 'topup'
}

export default function HistoryClient({
  purchases, stats, transactions,
}: {
  purchases: Purchase[]
  stats: Stats
  transactions: WalletTx[]
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'purchase' | 'soldback' | 'shipped' | 'topup'>('all')
  const [tab, setTab] = useState<'activity' | 'wallet'>('activity')

  const listRows: ListRow[] = []

  purchases.forEach(p => {
    if (p.outcome === 'SOLD_BACK' || p.outcome === 'AUTO_SOLD') {
      listRows.push({
        id: p.id + '_sell', purchaseId: p.id,
        date: new Date(p.createdAt).toLocaleDateString(),
        itemName: p.itemName, subName: p.dropName,
        itemImageUrl: p.itemImageUrl,
        action: p.outcome === 'AUTO_SOLD' ? 'Auto Sold Back' : 'Sold Back',
        actionClass: 'outcome_SOLD_BACK',
        amount: p.refundAmt, amountSign: '+',
        filterType: 'soldback',
      })
    } else if (p.outcome === 'DELIVERY') {
      listRows.push({
        id: p.id + '_del', purchaseId: p.id,
        date: new Date(p.createdAt).toLocaleDateString(),
        itemName: p.itemName, subName: p.dropName,
        itemImageUrl: p.itemImageUrl,
        action: 'Shipped', actionClass: 'outcome_DELIVERY',
        amount: p.itemShippingCost, amountSign: '-',
        filterType: 'shipped',
      })
    }
    listRows.push({
      id: p.id + '_buy', purchaseId: p.id,
      date: new Date(p.createdAt).toLocaleDateString(),
      itemName: p.itemName, subName: p.dropName,
      itemImageUrl: p.itemImageUrl,
      action: 'Bought', actionClass: 'outcome_BUY',
      amount: p.pricePaid, amountSign: '-',
      filterType: 'purchase',
    })
  })

  const filtered = filter === 'all' ? listRows : listRows.filter(r => r.filterType === filter)

  const walletRows = transactions.map(t => ({
    id: t.id,
    date: new Date(t.createdAt).toLocaleDateString(),
    time: new Date(t.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    description: t.description,
    type: t.type,
    amount: t.amount,
  }))

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>History</h1>
          <p className={styles.sub}>All your activity and wallet transactions.</p>
        </div>
        <a href="/api/export/buyer" className={styles.exportBtn}>⬇ CSV</a>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#3DD68C'}}>${stats.deposited.toFixed(2)}</div><div className={styles.statLbl}>Deposited</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#FF6B85'}}>${stats.spent.toFixed(2)}</div><div className={styles.statLbl}>Total Spent</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#5FFFA8'}}>${stats.soldBack.toFixed(2)}</div><div className={styles.statLbl}>Sold Back</div></div>
        <div className={styles.stat}><div className={styles.statVal} style={{color:'#7EC8FF'}}>{stats.deliveries}</div><div className={styles.statLbl}>Deliveries</div></div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'0.4rem',marginBottom:'1rem'}}>
        <button
          onClick={() => setTab('activity')}
          style={{ background: tab === 'activity' ? 'rgba(255,107,133,0.15)' : 'transparent', color: tab === 'activity' ? '#FF8FA3' : 'var(--text2)', border: `1px solid ${tab === 'activity' ? '#FF6B85' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 1rem', cursor: 'pointer' }}
        >
          Box Activity
        </button>
        <button
          onClick={() => setTab('wallet')}
          style={{ background: tab === 'wallet' ? 'rgba(255,107,133,0.15)' : 'transparent', color: tab === 'wallet' ? '#FF8FA3' : 'var(--text2)', border: `1px solid ${tab === 'wallet' ? '#FF6B85' : 'rgba(255,255,255,0.1)'}`, borderRadius: 8, fontFamily: 'var(--font)', fontSize: '0.78rem', fontWeight: 700, padding: '0.4rem 1rem', cursor: 'pointer' }}
        >
          Wallet
        </button>
      </div>

      {tab === 'activity' && (
        <>
          <div style={{marginBottom:'1rem'}}>
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

          {filtered.length === 0 ? (
            <div className={styles.empty}><div className={styles.emptyIcon}><Package size={30} strokeWidth={1.4} /></div><p>No activity yet.</p></div>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.tableHead}>
                <span></span>
                <span>Date</span>
                <span>Item</span>
                <span>Action</span>
                <span>Amount</span>
              </div>
              {filtered.map(row => (
                <div
                  key={row.id}
                  className={styles.tableRow}
                  onClick={() => row.purchaseId && router.push(`/dashboard/history/${row.purchaseId}`)}
                  style={{cursor: row.purchaseId ? 'pointer' : 'default'}}
                >
                  <span className={styles.cellThumb}>
                    {row.itemImageUrl
                      ? <img src={row.itemImageUrl} alt={row.itemName} className={styles.thumbImg} />
                      : <span className={styles.thumbEmoji}><Gift size={18} /></span>}
                  </span>
                  <span className={styles.cellMuted}>{row.date}</span>
                  <span>
                    <div className={styles.cellName}>{row.itemName}</div>
                    <div className={styles.cellSub}>{row.subName}</div>
                  </span>
                  <span>
                    <span className={`${styles.outcomeTag} ${styles[row.actionClass]}`}>{row.action}</span>
                  </span>
                  <span className={styles.cellMono} style={{color: row.amountSign === '+' ? '#5FFFA8' : '#FF8FA3'}}>
                    {row.amountSign}${row.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'wallet' && (
        <>
          {walletRows.length === 0 ? (
            <div className={styles.empty}><div className={styles.emptyIcon}><CreditCard size={30} strokeWidth={1.4} /></div><p>No wallet transactions yet.</p></div>
          ) : (
            <div className={styles.tableWrap}>
              <div className={styles.tableHead} style={{gridTemplateColumns:'110px 1fr 100px 90px'}}>
                <span>Date</span>
                <span>Description</span>
                <span>Type</span>
                <span>Amount</span>
              </div>
              {walletRows.map(row => {
                const isPos = row.amount > 0
                const typeLabel = row.type === 'topup' ? 'Deposit' : row.type === 'purchase' ? 'Purchase' : row.type === 'sellback' ? 'Sell Back' : row.type === 'shipping' ? 'Shipping' : row.type
                const typeCls = row.type === 'topup' ? { background:'rgba(61,214,140,0.15)', color:'#3DD68C', border:'1px solid rgba(61,214,140,0.3)' } : row.type === 'sellback' ? { background:'rgba(95,255,168,0.12)', color:'#5FFFA8', border:'1px solid rgba(95,255,168,0.3)' } : { background:'rgba(255,107,133,0.12)', color:'#FF8FA3', border:'1px solid rgba(255,107,133,0.3)' }
                return (
                  <div key={row.id} className={styles.tableRow} style={{gridTemplateColumns:'110px 1fr 100px 90px'}}>
                    <span className={styles.cellMuted}>{row.date} <span style={{fontSize:'0.65rem'}}>{row.time}</span></span>
                    <span className={styles.cellName}>{row.description}</span>
                    <span><span style={{fontSize:'0.62rem',fontWeight:700,padding:'2px 7px',borderRadius:4,...typeCls}}>{typeLabel}</span></span>
                    <span className={styles.cellMono} style={{color: isPos ? '#5FFFA8' : '#FF8FA3'}}>
                      {isPos ? '+' : ''}${Math.abs(row.amount).toFixed(2)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}