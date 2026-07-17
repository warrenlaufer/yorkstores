import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

// Admin-only box inspector: shows the CURRENT item sitting in each box of a drop.
// NOTE: this mapping is live and ephemeral — every purchase and sell-back reshuffles all unsold
// boxes, so a snapshot here is only accurate until the next transaction on that drop. Box IDs are
// the only stable identifier; the #NN a buyer sees on the drop page is a cosmetic per-slot label.
export default async function AdminBoxesPage({ searchParams }: { searchParams: { drop?: string } }) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) redirect('/dashboard')

  const drops = await prisma.drop.findMany({
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, _count: { select: { boxes: true } } },
  })

  const selectedId = searchParams.drop || ''
  const selected = selectedId
    ? await prisma.drop.findUnique({ where: { id: selectedId }, select: { id: true, name: true } })
    : null

  const boxes = selected
    ? await prisma.box.findMany({
        where: { dropId: selected.id, removed: false },
        orderBy: [{ sold: 'asc' }, { itemPrice: 'desc' }],
        select: {
          id: true, itemName: true, itemPrice: true, sold: true, sku: true,
          purchases: {
            orderBy: { createdAt: 'desc' }, take: 1,
            select: { createdAt: true, buyer: { select: { email: true } } },
          },
        },
      })
    : []

  const unsold = boxes.filter(b => !b.sold).length
  const sold = boxes.length - unsold

  // Item breakdown across unsold boxes (what's still live in the pool)
  const bd: Record<string, { name: string; price: number; count: number }> = {}
  boxes.filter(b => !b.sold).forEach(b => {
    const k = b.sku ? `sku:${b.sku}` : `${b.itemName}|${Number(b.itemPrice)}`
    if (!bd[k]) bd[k] = { name: b.itemName, price: Number(b.itemPrice), count: 0 }
    bd[k].count++
  })
  const breakdown = Object.values(bd).sort((a, b) => b.price - a.price)

  const card: React.CSSProperties = { background: 'var(--surface-2)', border: '1px solid #303039', borderRadius: 12, padding: '1rem 1.25rem' }
  const th: React.CSSProperties = { textAlign: 'left', padding: '8px 10px', fontSize: 12, color: 'var(--text3)', fontWeight: 700, borderBottom: '1px solid #303039' }
  const td: React.CSSProperties = { padding: '8px 10px', fontSize: 13, borderBottom: '1px solid #24242e' }

  return (
    <div style={{ maxWidth: 980, margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <Link href="/dashboard/admin" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none' }}>← Admin</Link>
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Box Inspector</h1>
      </div>
      <p style={{ color: 'var(--text3)', fontSize: 13, margin: '0 0 1.25rem' }}>
        Current contents of each box. This reshuffles on every purchase and sell-back, so it&rsquo;s a live snapshot — accurate until the next transaction on the drop.
      </p>

      <div style={{ ...card, marginBottom: '1.25rem' }}>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700, marginBottom: 10 }}>SELECT A DROP</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {drops.map(d => {
            const active = d.id === selectedId
            return (
              <Link key={d.id} href={`/dashboard/admin/boxes?drop=${d.id}`}
                style={{
                  fontSize: 13, padding: '6px 12px', borderRadius: 8, textDecoration: 'none',
                  border: active ? '1px solid var(--accent)' : '1px solid #303039',
                  background: active ? 'rgba(255,107,133,0.12)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text)',
                }}>
                {d.name} <span style={{ color: 'var(--text3)' }}>({d._count.boxes})</span>
              </Link>
            )
          })}
        </div>
      </div>

      {selected && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
            <div style={{ ...card, flex: 1, minWidth: 120 }}><div style={{ fontSize: 24, fontWeight: 800 }}>{boxes.length}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Boxes (active)</div></div>
            <div style={{ ...card, flex: 1, minWidth: 120 }}><div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)' }}>{unsold}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Unsold (in pool)</div></div>
            <div style={{ ...card, flex: 1, minWidth: 120 }}><div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text3)' }}>{sold}</div><div style={{ fontSize: 12, color: 'var(--text3)' }}>Sold / opened</div></div>
          </div>

          {breakdown.length > 0 && (
            <div style={{ ...card, marginBottom: '1.25rem' }}>
              <div style={{ fontSize: 12, color: 'var(--text3)', fontWeight: 700, marginBottom: 10 }}>STILL IN THE POOL (unsold, by item)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {breakdown.map((it, i) => (
                  <div key={i} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: '1px solid #303039' }}>
                    {it.name} · <strong>${it.price.toLocaleString()}</strong> <span style={{ color: 'var(--text3)' }}>×{it.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Item</th>
                  <th style={th}>Value</th>
                  <th style={th}>SKU</th>
                  <th style={th}>Status</th>
                  <th style={th}>Opened by</th>
                  <th style={th}>Box ID</th>
                </tr>
              </thead>
              <tbody>
                {boxes.map(b => (
                  <tr key={b.id}>
                    <td style={td}>{b.itemName}</td>
                    <td style={td}>${Number(b.itemPrice).toLocaleString()}</td>
                    <td style={{ ...td, color: 'var(--text3)' }}>{b.sku || '—'}</td>
                    <td style={{ ...td, color: b.sold ? 'var(--text3)' : 'var(--accent)', fontWeight: 600 }}>{b.sold ? 'Opened' : 'In pool'}</td>
                    <td style={{ ...td, color: 'var(--text3)' }}>{b.purchases[0]?.buyer?.email || '—'}</td>
                    <td style={{ ...td, color: 'var(--text3)', fontFamily: 'monospace', fontSize: 11 }}>…{b.id.slice(-8)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
