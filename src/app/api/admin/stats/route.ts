import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const [userCount, dropCount, purchaseCount, totalRevenue, recentPurchases] = await Promise.all([
    prisma.user.count(),
    prisma.drop.count(),
    prisma.purchase.count(),
    prisma.purchase.aggregate({ _sum: { pricePaid: true } }),
    prisma.purchase.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        buyer: { select: { name: true, email: true } },
        box: { include: { drop: { select: { name: true } } } },
      },
    }),
  ])

  return ok({
    stats: {
      users: userCount,
      drops: dropCount,
      purchases: purchaseCount,
      totalRevenue: Number(totalRevenue._sum.pricePaid ?? 0),
      platformFee: Number(totalRevenue._sum.pricePaid ?? 0) * 0.1,
    },
    recentPurchases: recentPurchases.map(p => ({
      id: p.id,
      buyer: p.buyer.name,
      item: p.box.itemName,
      drop: p.box.drop.name,
      amount: Number(p.pricePaid),
      outcome: p.outcome,
      createdAt: p.createdAt,
    })),
  })
}
