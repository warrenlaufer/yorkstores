import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { sendSellBackConfirmationEmail } from '@/lib/email'
import { OutcomeType } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ purchaseId: z.string().cuid() })

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: parsed.data.purchaseId },
      include: { box: { include: { drop: { include: { owner: true } } } } },
    })

    if (!purchase) throw new Error('Purchase not found')
    if (purchase.buyerId !== user.id) throw new Error('Forbidden')
    if (purchase.outcome) throw new Error('This purchase has already been resolved')

    const itemValue = Number(purchase.box.itemPrice)
    const buyerRefund = Math.round(itemValue * 0.9 * 100) / 100
    const owner = purchase.box.drop.owner

    if (Number(owner.storeBalance) < itemValue) throw new Error('Store wallet insufficient for buyback')

    // Credit buyer
    await tx.user.update({ where: { id: user.id }, data: { walletBalance: { increment: buyerRefund } } })

    // Deduct from store
    await tx.user.update({ where: { id: owner.id }, data: { storeBalance: { decrement: itemValue } } })

    // Find a random unsold box in the same drop to swap items with
    const unsoldBoxes = await tx.box.findMany({
      where: { dropId: purchase.box.dropId, sold: false, id: { not: purchase.box.id } },
      select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true },
    })

    if (unsoldBoxes.length > 0) {
      // Pick a random unsold box to swap with
      const swapBox = unsoldBoxes[Math.floor(Math.random() * unsoldBoxes.length)]

      // Swap item details between the sold-back box and the random unsold box
      await tx.box.update({
        where: { id: purchase.box.id },
        data: {
          sold: false,
          itemName: swapBox.itemName,
          itemPrice: swapBox.itemPrice,
          itemShippingCost: swapBox.itemShippingCost,
          itemImageUrl: swapBox.itemImageUrl,
        },
      })
      await tx.box.update({
        where: { id: swapBox.id },
        data: {
          itemName: purchase.box.itemName,
          itemPrice: purchase.box.itemPrice,
          itemShippingCost: purchase.box.itemShippingCost,
          itemImageUrl: purchase.box.itemImageUrl,
        },
      })
    } else {
      // No other unsold boxes — just mark it unsold as-is
      await tx.box.update({ where: { id: purchase.box.id }, data: { sold: false } })
    }

    // Record outcome
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { outcome: OutcomeType.SOLD_BACK, refundAmt: buyerRefund, resolvedAt: new Date() },
    })

    // Transactions
    await tx.transaction.createMany({
      data: [
        { userId: user.id, dropId: purchase.box.dropId, type: 'sellback', description: `Sold back: ${purchase.box.itemName}`, amount: buyerRefund },
        { userId: owner.id, dropId: purchase.box.dropId, type: 'buyback', description: `Buyback: ${purchase.box.itemName}`, amount: -itemValue },
      ],
    })

    return { refundAmount: buyerRefund, newBalance: Number(user.walletBalance) + buyerRefund }
  })

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parsed.data.purchaseId },
      include: { box: true },
    })
    if (purchase) {
      await sendSellBackConfirmationEmail(user.email, user.name, {
        itemName: purchase.box.itemName,
        refundAmount: result.refundAmount,
      })
    }
  } catch (e) {
    console.error('Sell-back email failed:', e)
  }

  return ok(result)
}