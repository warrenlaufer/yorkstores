import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { calcBoxPrice } from '@/lib/stripe'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const drop = await prisma.drop.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: {
        select: {
          id: true,
          itemName: true,
          itemPrice: true,
          itemShippingCost: true,
          itemImageUrl: true,
          sold: true,
        },
      },
    },
  })

  if (!drop) return err('Drop not found', 404)

  const allPrices = drop.boxes.map(b => Number(b.itemPrice))

  return ok({
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
      itemImageUrl: b.itemImageUrl,
      sold: b.sold,
    })),
  })
}
