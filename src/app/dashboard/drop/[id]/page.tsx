import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcBoxPrice } from '@/lib/stripe'
import { redirect, notFound } from 'next/navigation'
import DropDetailClient from '@/components/DropDetailClient'

export const dynamic = 'force-dynamic'

export default async function DropPage({ params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) redirect('/signin')

  const drop = await prisma.drop.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: {
        select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true, sold: true },
      },
    },
  })

  if (!drop) notFound()

  const allPrices = drop.boxes.map(b => Number(b.itemPrice))

  return (
    <DropDetailClient
      drop={{
        id: drop.id,
        name: drop.name,
        emoji: drop.emoji,
        owner: drop.owner.company ?? drop.owner.name,
        boxPrice: calcBoxPrice(allPrices),
        boxes: drop.boxes.map(b => ({
          id: b.id,
          itemName: b.itemName,
          itemPrice: Number(b.itemPrice),
          itemShippingCost: Number(b.itemShippingCost),
          itemImageUrl: b.itemImageUrl ?? undefined,
          sold: b.sold,
        })),
      }}
      user={{ walletBalance: Number(user.walletBalance) }}
    />
  )
}
