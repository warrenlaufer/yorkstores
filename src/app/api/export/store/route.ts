import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { err } from '@/lib/api'
import { Role } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId: user.id,
      type: { in: ['sale', 'buyback', 'shipping_credit'] },
    },
    orderBy: { createdAt: 'desc' },
  })

  function getGross(type: string, amount: number) {
    if (type === 'sale' || type === 'shipping_credit') return Math.round((Math.abs(amount) / 0.95) * 100) / 100
    return Math.abs(amount)
  }

  function getFee(type: string, amount: number) {
    const gross = getGross(type, amount)
    if (type === 'sale' || type === 'shipping_credit') return Math.round(gross * 0.05 * 100) / 100
    return 0
  }

  const rows = [
    ['Date', 'Time', 'Description', 'Type', 'Gross', 'Platform Fee', 'Net'],
    ...transactions.map(t => {
      const d = new Date(t.createdAt)
      const amt = Number(t.amount)
      const gross = getGross(t.type, amt)
      const fee = getFee(t.type, amt)
      return [
        d.toLocaleDateString('en-US'),
        d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        t.description,
        t.type === 'sale' ? 'Sale' : t.type === 'buyback' ? 'Buyback' : 'Shipping',
        gross.toFixed(2),
        fee.toFixed(2),
        Math.abs(amt).toFixed(2),
      ]
    }),
  ]

  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="yorkstores-store-history-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  })
}