import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { sendSellBackConfirmationEmail, sendStoreSellBackNotificationEmail } from '@/lib/email'
import { OutcomeType } from '@prisma/client'
import { shuffleUnsoldBoxes } from '@/lib/shuffle'
import { z } from 'zod'

const schema = z.object({ purchaseId: z.string().min(1) })

// A store may carry a negative balance (covered by the platform) down to this floor.
const STORE_CREDIT_LIMIT = -3000

const round2 = (n: number) => Math.round(n * 100) / 100

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  try {
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: parsed.data.purchaseId },
        include: { box: { include: { drop: true } } },
      })

      if (!purchase) throw new Error('NOT_FOUND')
      if (purchase.buyerId !== user.id) throw new Error('FORBIDDEN')
      if (purchase.outcome) throw new Error('RESOLVED')

      const itemValue = Number(purchase.box.itemPrice)
      const sellBackPct = purchase.box.drop.sellBackPct
      const ownerId = purchase.box.drop.ownerId
      const dropId = purchase.box.dropId
      const itemName = purchase.box.itemName

      const buyerRefund = round2(itemValue * (sellBackPct / 100))

      // The buyback comes back in the same promo/cash ratio the box was funded with.
      const pricePaid = Number(purchase.pricePaid)
      const promoFraction = pricePaid > 0 ? Number(purchase.promoPaid) / pricePaid : 0
      const toPromo = round2(buyerRefund * promoFraction)
      const toCash = round2(buyerRefund - toPromo)

      // Read the store balance fresh inside the transaction (serializable) for a safe limit check.
      const ownerRow = await tx.user.findUnique({ where: { id: ownerId }, select: { storeBalance: true, email: true, name: true } })
      const storeBefore = Number(ownerRow?.storeBalance ?? 0)
      const storeAfter = round2(storeBefore - buyerRefund)

      // Over the credit limit: reject, log the failure, and suspend the store's drops.
      if (storeAfter < STORE_CREDIT_LIMIT) {
        await tx.transaction.create({
          data: {
            userId: ownerId, dropId, type: 'buyback_failed',
            description: `Buyback failed — store over $${Math.abs(STORE_CREDIT_LIMIT)} credit limit: ${itemName}`,
            amount: 0,
          },
        })
        await tx.drop.updateMany({ where: { ownerId }, data: { isActive: false } })
        return { status: 'limit' as const }
      }

      // Portion that pushes the store further below zero is fronted by the platform ("admin account").
      const adminFronted = round2(Math.max(0, -storeAfter) - Math.max(0, -storeBefore))

      await tx.user.update({
        where: { id: user.id },
        data: {
          walletBalance: { increment: buyerRefund },
          cashBalance: { increment: toCash },
          promoBalance: { increment: toPromo },
        },
      })
      await tx.user.update({ where: { id: ownerId }, data: { storeBalance: { decrement: buyerRefund } } })
      await tx.box.update({ where: { id: purchase.box.id }, data: { sold: false } })
      await tx.purchase.update({
        where: { id: purchase.id },
        data: { outcome: OutcomeType.SOLD_BACK, refundAmt: buyerRefund, resolvedAt: new Date() },
      })
      await tx.transaction.create({ data: { userId: user.id, dropId, type: 'sellback', description: `Sold back: ${itemName}`, amount: buyerRefund } })
      await tx.transaction.create({ data: { userId: ownerId, dropId, type: 'buyback', description: `Buyback: ${itemName}`, amount: -buyerRefund } })
      if (adminFronted > 0) {
        await tx.platformTransaction.create({
          data: { type: 'buyback_advance', description: `Covered store buyback shortfall: ${itemName}`, amount: -adminFronted, dropId },
        })
      }

      return { status: 'ok' as const, buyerRefund, toCash, toPromo, itemName, dropName: purchase.box.drop.name, ownerEmail: ownerRow?.email ?? null, ownerName: ownerRow?.name ?? 'there', storeAfter, adminFronted, dropId }
    }, { isolationLevel: 'Serializable', timeout: 10000 })

    if (result.status === 'limit') {
      return err('This store has reached its buyback credit limit and is temporarily suspended. You can choose delivery instead, or try again later.', 409)
    }

    // The box just returned to the pool — re-randomize so it can't be replayed for the same item.
    await shuffleUnsoldBoxes(result.dropId)

    try {
      await sendSellBackConfirmationEmail(user.email, user.name, {
        itemName: result.itemName,
        refundAmount: result.buyerRefund,
      })
    } catch (e) {
      console.error('Sell-back email failed:', e)
    }

    if (result.ownerEmail) {
      try {
        await sendStoreSellBackNotificationEmail(result.ownerEmail, result.ownerName, {
          dropName: result.dropName,
          itemName: result.itemName,
          refundAmount: result.buyerRefund,
          newStoreBalance: result.storeAfter,
          platformCovered: result.adminFronted,
        })
      } catch (e) {
        console.error('Store sell-back email failed:', e)
      }
    }

    return ok({
      refundAmount: result.buyerRefund,
      newBalance: Number(user.walletBalance) + result.buyerRefund,
      newCashBalance: Number(user.cashBalance) + result.toCash,
      newPromoBalance: Number(user.promoBalance) + result.toPromo,
    })
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return err('Purchase not found')
    if (e.message === 'FORBIDDEN') return err('Forbidden')
    if (e.message === 'RESOLVED') return err('This purchase has already been resolved')
    console.error('Sellback error:', e)
    return err('Sell-back failed — please try again')
  }
}
