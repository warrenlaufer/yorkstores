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

  const [transactions, drops] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.drop.findMany({
      where: { ownerId: user.id },
      include: {
        boxes: { select: { id: true, sold: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <StoreOwnerClient
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        company: user.company ?? '',
        storeBalance: Number(user.storeBalance),
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
        totalBoxes: d.boxes.length,
        soldBoxes: d.boxes.filter(b => b.sold).length,
        sellBackPct: d.sellBackPct,
        pricingType: d.pricingType,
        category: d.category,
      }))}
    />
  )
}