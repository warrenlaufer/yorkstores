import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import HistoryClient from './HistoryClient'

export const dynamic = 'force-dynamic'

export default async function HistoryPage() {
  const user = await getSession()
  if (!user) redirect('/signin')

  const purchases = await prisma.purchase.findMany({
    where: { buyerId: user.id },
    include: {
      box: { include: { drop: { select: { name: true, emoji: true, logoUrl: true } } } },
      order: { select: { status: true, trackingNumber: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  let runningBalance = Number(user.walletBalance)
  const purchasesWithBalance = [...purchases].reverse().map(p => {
    const before = runningBalance + Number(p.pricePaid) - Number(p.refundAmt)
    const after = before - Number(p.pricePaid) + Number(p.refundAmt)
    runningBalance = after
    return {
      id: p.id,
      itemName: p.box.itemName,
      itemPrice: Number(p.box.itemPrice),
      itemShippingCost: Number(p.box.itemShippingCost),
      itemImageUrl: p.box.itemImageUrl,
      dropName: p.box.drop.name,
      dropEmoji: p.box.drop.emoji,
      dropLogoUrl: p.box.drop.logoUrl,
      pricePaid: Number(p.pricePaid),
      refundAmt: Number(p.refundAmt),
      outcome: p.outcome,
      trackingNumber: p.order?.trackingNumber ?? null,
      orderStatus: p.order?.status ?? null,
      createdAt: p.createdAt.toISOString(),
      balanceBefore: before,
      balanceAfter: after,
    }
  }).reverse()

  const deliveries = purchases.filter(p => p.outcome === 'DELIVERY').length
  const soldBack = purchases.filter(p => p.outcome === 'SOLD_BACK' || p.outcome === 'AUTO_SOLD').reduce((s, p) => s + Number(p.refundAmt), 0)
  const spent = purchases.reduce((s, p) => s + Number(p.pricePaid), 0)

  return (
    <HistoryClient
      purchases={purchasesWithBalance}
      stats={{ deliveries, soldBack, spent }}
    />
  )
}