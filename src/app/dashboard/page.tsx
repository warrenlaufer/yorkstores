import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcBoxPriceForDrop } from '@/lib/stripe'
import { redirect } from 'next/navigation'
import DropsClient from '@/components/DropsClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/signin')

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const drops = await prisma.drop.findMany({
    where: { isActive: true },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: { select: { id: true, itemPrice: true, sold: true } },
      purchases: {
        where: { createdAt: { gte: since24h } },
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const dropsData = drops.map(d => {
    const allPrices = d.boxes.map(b => Number(b.itemPrice))
    const unsoldPrices = d.boxes.filter(b => !b.sold).map(b => Number(b.itemPrice))
    const available = d.boxes.filter(b => !b.sold).length
    return {
      id: d.id,
      name: d.name,
      emoji: d.emoji,
      logoUrl: d.logoUrl ?? undefined,
      owner: d.owner.company ?? d.owner.name,
      boxPrice: calcBoxPriceForDrop(allPrices, unsoldPrices, d.pricingType),
      totalBoxes: d.boxes.length,
      availableBoxes: available,
      minPrice: allPrices.length ? Math.min(...allPrices) : 0,
      maxPrice: allPrices.length ? Math.max(...allPrices) : 0,
      category: d.category,
      pricingType: d.pricingType,
      sellBackPct: d.sellBackPct,
      createdAt: d.createdAt.toISOString(),
      recentPurchases: d.purchases.length,
    }
  })

  return (
    <DropsClient
      drops={dropsData}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalance: Number(user.walletBalance),
      }}
    />
  )
}