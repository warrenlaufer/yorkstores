import { prisma } from '@/lib/prisma'
import { calcBoxPriceForDrop } from '@/lib/stripe'
import { notFound } from 'next/navigation'
import PublicDropClient from './PublicDropClient'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const drop = await prisma.drop.findUnique({
    where: { id: params.id },
    include: { owner: { select: { name: true, company: true } } },
  })
  if (!drop) return { title: 'Drop Not Found' }
  return {
    title: `${drop.name} — Yorkstores`,
    description: `Open mystery boxes from ${drop.owner.company ?? drop.owner.name}. Keep what you love or sell back instantly.`,
    openGraph: {
      title: `${drop.name} — Yorkstores`,
      description: `Open mystery boxes from ${drop.owner.company ?? drop.owner.name}.`,
      images: drop.logoUrl ? [drop.logoUrl] : [],
    },
  }
}

export default async function PublicDropPage({ params }: { params: { id: string } }) {
  const drop = await prisma.drop.findUnique({
    where: { id: params.id, isActive: true },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: {
        select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true, sold: true },
      },
    },
  })

  if (!drop) notFound()

  const allPrices = drop.boxes.map(b => Number(b.itemPrice))
  const unsoldPrices = drop.boxes.filter(b => !b.sold).map(b => Number(b.itemPrice))
  const available = drop.boxes.filter(b => !b.sold).length

  return (
    <PublicDropClient
      drop={{
        id: drop.id,
        name: drop.name,
        emoji: drop.emoji,
        logoUrl: drop.logoUrl ?? null,
        owner: drop.owner.company ?? drop.owner.name,
        boxPrice: calcBoxPriceForDrop(allPrices, unsoldPrices, drop.pricingType),
        sellBackPct: drop.sellBackPct,
        pricingType: drop.pricingType,
        category: drop.category,
        totalBoxes: drop.boxes.length,
        availableBoxes: available,
        minPrice: allPrices.length ? Math.min(...allPrices) : 0,
        maxPrice: allPrices.length ? Math.max(...allPrices) : 0,
        boxes: drop.boxes.map(b => ({
          id: b.id,
          itemName: b.itemName,
          itemPrice: Number(b.itemPrice),
          itemShippingCost: Number(b.itemShippingCost),
          itemImageUrl: b.itemImageUrl ?? null,
          sold: b.sold,
        })),
      }}
    />
  )
}