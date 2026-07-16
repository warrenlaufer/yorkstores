import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcBoxPriceForDrop } from '@/lib/stripe'
import { notFound } from 'next/navigation'
import DropDetailClient from '@/components/DropDetailClient'
import DashboardNav from '@/components/DashboardNav'
import PublicHeader from '@/components/PublicHeader'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const drop = await prisma.drop.findUnique({
    where: { id: params.id },
    include: { owner: { select: { name: true, company: true } } },
  })
  if (!drop) return { title: 'Drop Not Found' }
  const seller = drop.owner.company ?? drop.owner.name
  return {
    title: `${drop.name} — Yorkstores`,
    description: `Open mystery boxes from ${seller}. Keep what you love or sell back instantly.`,
    openGraph: {
      title: `${drop.name} — Yorkstores`,
      description: `Open mystery boxes from ${seller}.`,
      images: drop.logoUrl ? [drop.logoUrl] : [],
    },
  }
}

export default async function PublicDropPage({ params, searchParams }: { params: { id: string }, searchParams: { error?: string } }) {
  const user = await getSession()

  const drop = await prisma.drop.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: { where: { removed: false }, select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true, sold: true } },
    },
  })

  if (!drop) notFound()

  const allPrices = drop.boxes.map(b => Number(b.itemPrice))
  const unsoldPrices = drop.boxes.filter(b => !b.sold).map(b => Number(b.itemPrice))

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
        <DropDetailClient
          initialError={typeof searchParams?.error === 'string' ? searchParams.error : ''}
          drop={{
            id: drop.id,
            name: drop.name,
            emoji: drop.emoji,
            logoUrl: drop.logoUrl ?? undefined,
            owner: drop.owner.company ?? drop.owner.name,
            boxPrice: calcBoxPriceForDrop(allPrices, unsoldPrices, drop.pricingType),
            sellBackPct: drop.sellBackPct,
            pricingType: drop.pricingType,
            boxes: drop.boxes.map(b => ({
              id: b.id,
              itemName: b.itemName,
              itemPrice: Number(b.itemPrice),
              itemShippingCost: Number(b.itemShippingCost),
              itemImageUrl: b.itemImageUrl ?? undefined,
              sold: b.sold,
            })),
          }}
          user={user ? { id: user.id, name: user.name, email: user.email, role: user.role, walletBalance: Number(user.walletBalance) } : null}
        />
      </main>
    </div>
  )
}
