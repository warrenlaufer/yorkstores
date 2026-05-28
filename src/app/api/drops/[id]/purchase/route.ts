import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { calcBoxPrice } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  dropId: z.string().min(1),
  boxId: z.string().optional(),
})

async function shuffleUnsoldBoxes(dropId: string) {
  try {
    const unsoldBoxes = await prisma.box.findMany({
      where: { dropId, sold: false },
      select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true },
    })
    if (unsoldBoxes.length <= 1) return

    const imageMap: Record<string, string | null> = {}
    unsoldBoxes.forEach(b => {
      const k = `${b.itemName}|${Number(b.itemPrice)}`
      if (!imageMap[k]) imageMap[k] = b.itemImageUrl ?? null
    })

    const identities = unsoldBoxes.map(b => ({
      itemName: b.itemName,
      itemPrice: b.itemPrice,
      itemShippingCost: b.itemShippingCost,
    }))

    for (let i = identities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[identities[i], identities[j]] = [identities[j], identities[i]]
    }

    const values = unsoldBoxes.map((b, idx) => {
      const identity = identities[idx]
      const k = `${identity.itemName}|${Number(identity.itemPrice)}`
      const img = imageMap[k]
      return `('${b.id}', '${identity.itemName.replace(/'/g, "''")}', ${Number(identity.itemPrice)}, ${Number(identity.itemShippingCost)}, ${img ? `'${img.replace(/'/g, "''")}'` : 'NULL'})`
    }).join(',')

    await prisma.$executeRawUnsafe(`
      UPDATE "Box" AS b SET
        "itemName" = v."itemName",
        "itemPrice" = v."itemPrice"::numeric,
        "itemShippingCost" = v."itemShippingCost"::numeric,
        "itemImageUrl" = v."itemImageUrl"
      FROM (VALUES ${values}) AS v(id, "itemName", "itemPrice", "itemShippingCost", "itemImageUrl")
      WHERE b.id = v.id
    `)
  } catch (e) {
    console.error('Shuffle failed:', e)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse({ dropId: params.id, ...body })
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { dropId, boxId } = parsed.data

  const [drop, allPrices] = await Promise.all([
    prisma.drop.findUnique({
      where: { id: dropId },
      include: { boxes: { where: { sold: false } }, owner: true },
    }),
    prisma.box.findMany({ where: { dropId }, select: { itemPrice: true } }),
  ])

  if (!drop || !drop.isActive) return err('Drop not found or inactive')
  if (!drop.boxes.length) return err('No boxes available')

  const box = boxId
    ? drop.boxes.find(b => b.id === boxId)
    : drop.boxes[Math.floor(Math.random() * drop.boxes.length)]

  if (!box) return err('Box not available')

  const boxPrice = calcBoxPrice(allPrices.map(b => Number(b.itemPrice)))
  const buyerBalance = Number(user.walletBalance)

  if (buyerBalance < boxPrice) return err('Insufficient wallet balance')

 const platformFee = Math.round(boxPrice * 0.05 * 100) / 100
  const storeCredit = Math.round(boxPrice * 0.95 * 100) / 100

  const purchase = await prisma.$transaction(async tx => {
    await tx.box.update({ where: { id: box.id }, data: { sold: true } })
    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: boxPrice } } })
    await tx.user.update({ where: { id: drop.ownerId }, data: { storeBalance: { increment: storeCredit } } })

    const p = await tx.purchase.upsert({
      where: { boxId: box.id },
      create: { buyerId: user.id, boxId: box.id, pricePaid: boxPrice },
      update: { buyerId: user.id, pricePaid: boxPrice, outcome: null, refundAmt: 0, resolvedAt: null },
    })

    await tx.transaction.createMany({
      data: [
        { userId: user.id, dropId, type: 'purchase', description: `Opened box: ${drop.name}`, amount: -boxPrice },
        { userId: drop.ownerId, dropId, type: 'sale', description: `Sale: ${drop.name}`, amount: storeCredit },
      ],
    })

    // Record platform revenue
    await tx.platformTransaction.create({
      data: {
        type: 'platform_fee',
        description: `Platform fee: ${drop.name}`,
        amount: platformFee,
        dropId,
      },
    })

    return p
  })

  shuffleUnsoldBoxes(dropId)

  return ok({
    purchaseId: purchase.id,
    box: {
      itemName: box.itemName,
      itemPrice: Number(box.itemPrice),
      itemShippingCost: Number(box.itemShippingCost),
      itemImageUrl: box.itemImageUrl,
    },
    pricePaid: boxPrice,
    newBalance: buyerBalance - boxPrice,
  }, 201)
}