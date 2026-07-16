import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Role } from '@prisma/client'
import StoreOwnerClient from '@/components/StoreOwnerClient'

export const dynamic = 'force-dynamic'

export default async function StorePage() {
  const user = await getSession()
  if (!user) redirect('/signin')
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) redirect('/dashboard')

  const [drops, transactions, reservedAgg] = await Promise.all([
    prisma.drop.findMany({
      where: user.role === Role.ADMIN ? {} : { ownerId: user.id },
      include: { boxes: { where: { removed: false }, select: { sold: true } }, owner: { select: { name: true, company: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.purchase.aggregate({
      where: { drop: { ownerId: user.id }, outcome: null },
      _sum: { reservedAmt: true },
    }),
  ])

  const reservedBalance = Number(reservedAgg._sum?.reservedAmt ?? 0)
  const availableBalance = Math.round((Number(user.storeBalance) - reservedBalance) * 100) / 100

  return (
    <StoreOwnerClient
      isAdmin={user.role === Role.ADMIN}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company ?? '',
        storeBalance: Number(user.storeBalance),
        reservedBalance,
        availableBalance,
        payoutsEnabled: user.payoutsEnabled,
      }}
      transactions={transactions.map(t => ({
        id: t.id,
        type: t.type,
        description: t.description,
        amount: Number(t.amount),
        createdAt: t.createdAt.toISOString(),
      }))}
      drops={drops.map(d => ({
        id: d.id,
        name: d.name,
        logoUrl: d.logoUrl ?? undefined,
        isActive: d.isActive,
        isDraft: d.isDraft,
        totalBoxes: d.boxes.length,
        soldBoxes: d.boxes.filter(b => b.sold).length,
        sellBackPct: d.sellBackPct,
        pricingType: d.pricingType,
        category: d.category,
        subcategory: d.subcategory,
        ownerName: d.owner.company || d.owner.name,
      }))}
    />
  )
}