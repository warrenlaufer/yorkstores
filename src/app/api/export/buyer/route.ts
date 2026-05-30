import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { err } from '@/lib/api'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const purchases = await prisma.purchase.findMany({
    where: { buyerId: user.id },
    include: {
      box: { include: { drop: { select: { name: true } } } },
      order: { select: { status: true, trackingNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = [
    ['Date', 'Time', 'Drop', 'Item', 'Item Value', 'Price Paid', 'Outcome', 'Refund Amount', 'Tracking Number'],
    ...purchases.map(p => {
      const d = new Date(p.createdAt)
      return [
        d.toLocaleDateString('en-US'),
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        p.box.drop.name,
        p.box.itemName,
        Number(p.box.itemPrice).toFixed(2),
        Number(p.pricePaid).toFixed(2),
        p.outcome ?? 'Pending',
        Number(p.refundAmt).toFixed(2),
        p.order?.trackingNumber ?? '',
      ]
    }),
  ]

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="yorkstores-history-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}