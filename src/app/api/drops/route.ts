import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { createDropSchema } from '@/lib/schemas'
import { calcBoxPrice } from '@/lib/stripe'
import { Role } from '@prisma/client'

export async function GET() {
  const drops = await prisma.drop.findMany({
    where: { isActive: true },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: { select: { id: true, itemPrice: true, sold: true, itemName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(drops.map(d => {
    const allPrices = d.boxes.map(b => Number(b.itemPrice))
    const available = d.boxes.filter(b => !b.sold).length
    return {
      id: d.id,
      name: d.name,
      emoji: d.emoji,
      logoUrl: d.logoUrl,
      owner: d.owner.company ?? d.owner.name,
      boxPrice: calcBoxPrice(allPrices),
      totalBoxes: d.boxes.length,
      availableBoxes: available,
      minPrice: Math.min(...allPrices),
      maxPrice: Math.max(...allPrices),
    }
  }))
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const parsed = createDropSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { name, emoji, boxes: boxDefs } = parsed.data
  const logoUrl = body?.logoUrl ?? null

  const boxRecords = boxDefs.flatMap(b =>
    Array.from({ length: b.qty }, () => ({
      itemName: b.itemName,
      itemPrice: b.itemPrice,
      itemShippingCost: b.itemShippingCost,
      itemImageUrl: b.itemImageUrl || null,
    }))
  )

  for (let i = boxRecords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[boxRecords[i], boxRecords[j]] = [boxRecords[j], boxRecords[i]]
  }

  const drop = await prisma.drop.create({
    data: {
      name,
      emoji,
      logoUrl,
      ownerId: user.id,
      boxes: { create: boxRecords },
    },
    include: {
      boxes: true,
      owner: { select: { name: true, company: true } },
    },
  })

  return ok(drop, 201)
}