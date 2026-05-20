import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { calcBoxPrice } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  dropId: z.string().cuid(),
  boxId: z.string().cuid().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse({ dropId: params.id, ...body })
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { dropId, boxId } = parsed.data

  const result = await prisma.$transaction(async (tx) => {
    const drop = await tx.drop.findUnique({
      where: { id: dropId },
      include: {
        boxes: { where: { sold: false } },
        owner: true,
      },
    })

    if (!drop || !drop.isActive) throw new Error('Drop not found or inactive')
    if (!drop.boxes.length) throw new Error('No boxes available')

    let box = boxId
      ? drop.boxes.find(b => b.id === boxId)
      : drop.boxes[Math.floor(Math.random() * drop.boxes.length)]

    if (!box) throw new Error('Box not available')

    const allPrices = (await tx.box.findMany({
      where: { dropId },
      select: { itemPrice: true },
    })).map(b => Number(b.itemPrice))

    const boxPrice = calcBoxPrice(allPrices)
    const buyerBalance = Number(user.walletBalance)

    if (buyerBalance < boxPrice) throw new Error('Insufficient wallet balance')

    const storeCredit = Math.round(boxPrice * 0.9 * 100) / 100

    // Mark box as sold
    await tx.box.update({ where: { id: box.id }, data: { sold: true } })

    // Deduct from buyer
    await tx.user.update({
      where: { id: user.id },
      data: { walletBalance: { decrement: boxPrice } },
    })

    // Credit store owner
    await tx.user.update({
      where: { id: drop.ownerId },
      data: { storeBalance: { increment: storeCredit } },
    })

    // Check if a previous purchase exists for this box (sold back previously)
    const existingPurchase = await tx.purchase.findUnique({ where: { boxId: box.id } })

    let purchase
    if (existingPurchase) {
      // Update the existing purchase record for reuse
      purchase = await tx.purchase.update({
        where: { boxId: box.id },
        data: {
          buyerId: user.id,
          pricePaid: boxPrice,
          outcome: null,
          refundAmt: 0,
          resolvedAt: null,
          createdAt: new Date(),
        },
      })
    } else {
      purchase = await tx.purchase.create({
        data: {
          buyerId: user.id,
          boxId: box.id,
          pricePaid: boxPrice,
        },
      })
    }

    // Record transactions
    await tx.transaction.createMany({
      data: [
        { userId: user.id, dropId, type: 'purchase', description: `Opened box: ${drop.name}`, amount: -boxPrice },
        { userId: drop.ownerId, dropId, type: 'sale', description: `Sale: ${drop.name}`, amount: storeCredit },
      ],
    })

    return {
      purchaseId: purchase.id,
      box: {
        itemName: box.itemName,
        itemPrice: Number(box.itemPrice),
        itemShippingCost: Number(box.itemShippingCost),
        itemImageUrl: box.itemImageUrl,
      },
      pricePaid: boxPrice,
      newBalance: buyerBalance - boxPrice,
    }
  })

  return ok(result, 201)
}