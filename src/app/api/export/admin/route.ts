import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { err } from '@/lib/api'
import { Role } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.ADMIN) return err('Forbidden', 403)

  const [purchases, platformTxs] = await Promise.all([
    prisma.purchase.findMany({
      include: {
        buyer: { select: { name: true, email: true } },
        box: { include: { drop: { include: { owner: { select: { name: true, company: true } } } } } },
        order: { select: { status: true, trackingNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.platformTransaction.findMany({
      include: { drop: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const purchaseRows = [
    ['--- PURCHASES ---'],
    ['Date', 'Time', 'Buyer', 'Buyer Email', 'Store', 'Drop', 'Item', 'Item Value', 'Price Paid', 'Platform Fee', 'Store Credit', 'Outcome', 'Refund', 'Tracking'],
    ...purchases.map(p => {
      const d = new Date(p.createdAt)
      const pricePaid = Number(p.pricePaid)
      const platformFee = Math.round(pricePaid * 0.05 * 100) / 100
      const storeCredit = Math.round(pricePaid * 0.95 * 100) / 100
      return [
        d.toLocaleDateString('en-US'),
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        p.buyer.name,
        p.buyer.email,
        p.box.drop.owner.company ?? p.box.drop.owner.name,
        p.box.drop.name,
        p.box.itemName,
        Number(p.box.itemPrice).toFixed(2),
        pricePaid.toFixed(2),
        platformFee.toFixed(2),
        storeCredit.toFixed(2),
        p.outcome ?? 'Pending',
        Number(p.refundAmt).toFixed(2),
        p.order?.trackingNumber ?? '',
      ]
    }),
  ]

  const platformRows = [
    [''],
    ['--- PLATFORM REVENUE ---'],
    ['Date', 'Time', 'Description', 'Type', 'Amount', 'Drop'],
    ...platformTxs.map(t => {
      const d = new Date(t.createdAt)
      return [
        d.toLocaleDateString('en-US'),
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        t.description,
        t.type,
        Number(t.amount).toFixed(2),
        t.drop?.name ?? '',
      ]
    }),
  ]

  const allRows = [...purchaseRows, ...platformRows]
  const csv = allRows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="yorkstores-admin-export-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}