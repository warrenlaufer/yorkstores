import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { calcBoxPriceForDrop } from '@/lib/stripe'
import { Role } from '@prisma/client'
import { normalizeSubcategory } from '@/lib/categories'

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
  const unsoldPrices = drop.boxes.filter(b => !b.sold).map(b => Number(b.itemPrice))

  return ok({
    id: drop.id,
    name: drop.name,
    emoji: drop.emoji,
    logoUrl: drop.logoUrl,
    sellBackPct: drop.sellBackPct,
    pricingType: drop.pricingType,
    category: drop.category,
    subcategory: drop.subcategory,
    boxPrice: calcBoxPriceForDrop(allPrices, unsoldPrices, drop.pricingType),
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

  const drop = await prisma.drop.findUnique({
    where: { id: params.id },
    include: { boxes: true },
  })
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
      ...(body.sellBackPct !== undefined && { sellBackPct: Math.min(100, Math.max(1, body.sellBackPct)) }),
      ...(body.pricingType !== undefined && { pricingType: body.pricingType === 'dynamic' ? 'dynamic' : 'fixed' }),
      ...(body.category !== undefined && { category: body.category, subcategory: normalizeSubcategory(body.category, body.subcategory) }),
    },
  })

  if (body.addBoxes && Array.isArray(body.addBoxes) && body.addBoxes.length > 0) {
    const newBoxRecords = body.addBoxes.flatMap((b: any) =>
      Array.from({ length: b.qty || 1 }, () => ({
        dropId: params.id,
        itemName: b.itemName,
        itemPrice: b.itemPrice,
        itemShippingCost: b.itemShippingCost || 0,
        itemImageUrl: b.itemImageUrl || null,
      }))
    )
    await prisma.box.createMany({ data: newBoxRecords })
  }

  if (body.removeBoxIds && Array.isArray(body.removeBoxIds) && body.removeBoxIds.length > 0) {
    await prisma.box.deleteMany({
      where: {
        id: { in: body.removeBoxIds },
        dropId: params.id,
        sold: false,
      },
    })
  }

  if (body.updateItems && Array.isArray(body.updateItems) && body.updateItems.length > 0) {
    for (const item of body.updateItems) {
      await prisma.box.updateMany({
        where: {
          dropId: params.id,
          sold: false,
          itemName: item.oldName,
          itemPrice: item.oldPrice,
        },
        data: {
          ...(item.newName !== undefined && { itemName: item.newName }),
          ...(item.newPrice !== undefined && { itemPrice: item.newPrice }),
          ...(item.newShipping !== undefined && { itemShippingCost: item.newShipping }),
        },
      })
    }
  }

  return ok(updated)
}