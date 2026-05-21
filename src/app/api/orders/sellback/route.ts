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

  // Step 1 — load purchase outside transaction
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

  // Step 2 — do financial updates and outcome in a fast transaction
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

  // Step 3 — shuffle unsold boxes outside transaction (can be slower)
  const unsoldBoxes = await prisma.box.findMany({
    where: { dropId: purchase.box.dropId, sold: false },
    select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true },
  })

  if (unsoldBoxes.length > 1) {
    // Build image map so images stay tied to item identity
    const imageMap: Record<string, string | null> = {}
    unsoldBoxes.forEach(b => {
      const k = `${b.itemName}|${Number(b.itemPrice)}`
      if (!imageMap[k]) imageMap[k] = b.itemImageUrl ?? null
    })

    // Shuffle item identities
    const identities = unsoldBoxes.map(b => ({
      itemName: b.itemName,
      itemPrice: b.itemPrice,
      itemShippingCost: b.itemShippingCost,
    }))

    for (let i = identities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[identities[i], identities[j]] = [identities[j], identities[i]]
    }

    // Write shuffled items back using raw SQL for speed
    await Promise.all(
      unsoldBoxes.map((box, idx) => {
        const identity = identities[idx]
        const k = `${identity.itemName}|${Number(identity.itemPrice)}`
        return prisma.box.update({
          where: { id: box.id },
          data: {
            itemName: identity.itemName,
            itemPrice: identity.itemPrice,
            itemShippingCost: identity.itemShippingCost,
            itemImageUrl: imageMap[k] ?? null,
          },
        })
      })
    )
  }

  // Step 4 — send email
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