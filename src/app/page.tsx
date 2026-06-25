import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcBoxPriceForDrop } from '@/lib/stripe'
import DropsClient from '@/components/DropsClient'
import DashboardNav from '@/components/DashboardNav'
import PublicHeader from '@/components/PublicHeader'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const user = await getSession()

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const drops = await prisma.drop.findMany({
    where: { isActive: true },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: { select: { id: true, itemPrice: true, sold: true } },
      purchases: { where: { createdAt: { gte: since24h } }, select: { id: true } },
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
      subcategory: d.subcategory,
      pricingType: d.pricingType,
      sellBackPct: d.sellBackPct,
      createdAt: d.createdAt.toISOString(),
      recentPurchases: d.purchases.length,
    }
  })

  return (
    <div>
      {user ? (
        <DashboardNav user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          company: user.company ?? undefined,
          walletBalance: Number(user.walletBalance),
          storeBalance: Number(user.storeBalance),
        }} />
      ) : (
        <PublicHeader />
      )}
      <main style={{ paddingTop: '4.5rem' }}>
        <DropsClient
          drops={dropsData}
          user={user ? { id: user.id, name: user.name, email: user.email, role: user.role, walletBalance: Number(user.walletBalance) } : null}
        />
      </main>
    </div>
  )
}
