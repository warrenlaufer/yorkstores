import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { createOrderSchema } from '@/lib/schemas'
import { sendOrderConfirmationEmail, sendNewOrderNotificationEmail } from '@/lib/email'
import { OutcomeType } from '@prisma/client'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = createOrderSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { purchaseId, ...addressData } = parsed.data

  const order = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { box: { include: { drop: { include: { owner: true } } } } },
    })

    if (!purchase) throw new Error('Purchase not found')
    if (purchase.buyerId !== user.id) throw new Error('Forbidden')
    if (purchase.outcome) throw new Error('Already resolved')

    const shippingCost = Number(purchase.box.itemShippingCost)
    const platformFee = Math.round(shippingCost * 0.05 * 100) / 100
    const storeShippingNet = Math.round((shippingCost - platformFee) * 100) / 100

    const order = await tx.order.create({
      data: { purchaseId, dropId: purchase.box.dropId, buyerId: user.id, ...addressData },
    })

    await tx.purchase.update({
      where: { id: purchaseId },
      data: { outcome: OutcomeType.DELIVERY, resolvedAt: new Date() },
    })

    if (shippingCost > 0) {
      await tx.user.update({ where: { id: user.id }, data: { walletBalance: { decrement: shippingCost } } })
      await tx.user.update({ where: { id: purchase.box.drop.ownerId }, data: { storeBalance: { increment: storeShippingNet } } })
      await tx.transaction.create({ data: { userId: user.id, dropId: purchase.box.dropId, type: 'shipping', description: `Shipping: ${purchase.box.itemName}`, amount: -shippingCost } })
      await tx.transaction.create({ data: { userId: purchase.box.drop.ownerId, dropId: purchase.box.dropId, type: 'shipping_credit', description: `Shipping credit: ${purchase.box.itemName}`, amount: storeShippingNet } })
      await tx.platformTransaction.create({ data: { type: 'platform_fee_shipping', description: `Platform fee (shipping): ${purchase.box.itemName}`, amount: platformFee, dropId: purchase.box.dropId } })

      // If this credit restores the store to solvent, lift any suspension (reactivate its drops).
      const ownerNow = await tx.user.findUnique({ where: { id: purchase.box.drop.ownerId }, select: { storeBalance: true } })
      if (ownerNow && Number(ownerNow.storeBalance) >= 0) {
        await tx.drop.updateMany({ where: { ownerId: purchase.box.drop.ownerId, isActive: false }, data: { isActive: true } })
      }
    }

    return { order, purchase }
  })

  try {
    const addrStr = [
      order.order.addressLine1, order.order.addressLine2,
      order.order.city, order.order.state,
      order.order.postcode, order.order.country,
    ].filter(Boolean).join('\n')

    await sendOrderConfirmationEmail(user.email, user.name, {
      itemName: order.purchase.box.itemName,
      dropName: order.purchase.box.drop.name,
      price: Number(order.purchase.box.itemPrice),
      address: addrStr,
    })

    await sendNewOrderNotificationEmail(order.purchase.box.drop.owner.email, order.purchase.box.drop.owner.name, {
      itemName: order.purchase.box.itemName,
      buyerName: user.name,
      address: addrStr,
    })
  } catch (e) {
    console.error('Order emails failed:', e)
  }

  return ok({ orderId: order.order.id }, 201)
}

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const { searchParams } = new URL(req.url)
  const purchaseId = searchParams.get('purchaseId')

  const purchases = await prisma.purchase.findMany({
    where: {
      buyerId: user.id,
      ...(purchaseId ? { id: purchaseId } : {}),
    },
    include: {
      box: { include: { drop: { select: { name: true, emoji: true } } } },
      order: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(purchases.map(p => ({
    id: p.id,
    itemName: p.box.itemName,
    itemPrice: Number(p.box.itemPrice),
    itemShippingCost: Number(p.box.itemShippingCost),
    itemImageUrl: p.box.itemImageUrl,
    dropName: p.box.drop.name,
    dropEmoji: p.box.drop.emoji,
    pricePaid: Number(p.pricePaid),
    outcome: p.outcome,
    refundAmt: Number(p.refundAmt),
    revealedAt: p.revealedAt?.toISOString() ?? null,
    createdAt: p.createdAt,
    order: p.order ? {
      status: p.order.status,
      trackingNumber: p.order.trackingNumber,
    } : null,
  })))
}