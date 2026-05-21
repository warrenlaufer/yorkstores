import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { sendSellBackConfirmationEmail } from '@/lib/email'
import { OutcomeType } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({ purchaseId: z.string().min(1) })

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const purchase = await prisma.purchase.findUnique({
    where: { id: parsed.data.purchaseId },
    include: { box: { include: { drop: { include: { owner: true } } } } },
  })

  if (!purchase) return err('Purchase not found')
  if (purchase.buyerId !== user.id) return err('Forbidden')
  if (purchase.outcome) return err('This purchase has already been resolved')

  const itemValue = Number(purchase.box.itemPrice)
  const buyerRefund = Math.round(itemValue * 0.9 * 100) / 100
  const owner = purchase.box.drop.owner

  if (Number(owner.storeBalance) < itemValue) return err('Store wallet insufficient for buyback')

  // Single fast batch transaction
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { walletBalance: { increment: buyerRefund } } }),
    prisma.user.update({ where: { id: owner.id }, data: { storeBalance: { decrement: itemValue } } }),
    prisma.box.update({ where: { id: purchase.box.id }, data: { sold: false } }),
    prisma.purchase.update({
      where: { id: purchase.id },
      data: { outcome: OutcomeType.SOLD_BACK, refundAmt: buyerRefund, resolvedAt: new Date() },
    }),
    prisma.transaction.create({
      data: { userId: user.id, dropId: purchase.box.dropId, type: 'sellback', description: `Sold back: ${purchase.box.itemName}`, amount: buyerRefund },
    }),
    prisma.transaction.create({
      data: { userId: owner.id, dropId: purchase.box.dropId, type: 'buyback', description: `Buyback: ${purchase.box.itemName}`, amount: -itemValue },
    }),
  ])

  // Send email
  try {
    await sendSellBackConfirmationEmail(user.email, user.name, {
      itemName: purchase.box.itemName,
      refundAmount: buyerRefund,
    })
  } catch (e) {
    console.error('Sell-back email failed:', e)
  }

  return ok({ refundAmount: buyerRefund, newBalance: Number(user.walletBalance) + buyerRefund })
}