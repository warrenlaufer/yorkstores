import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { calcBoxPrice } from '@/lib/stripe'
import { Role } from '@prisma/client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const drop = await prisma.drop.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: {
        select: {
          id: true, itemName: true, itemPrice: true,
          itemShippingCost: true, itemImageUrl: true, sold: true,
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
    logoUrl: drop.logoUrl,
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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const drop = await prisma.drop.findUnique({ where: { id: params.id } })
  if (!drop) return err('Drop not found', 404)

  if (drop.ownerId !== user.id && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  if (!body) return err('Invalid request')

  const updated = await prisma.drop.update({
    where: { id: params.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
  })

  return ok(updated)
}