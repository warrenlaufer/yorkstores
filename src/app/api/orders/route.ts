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

    const order = await tx.order.create({
      data: {
        purchaseId,
        dropId: purchase.box.dropId,
        buyerId: user.id,
        ...addressData,
      },
    })

    await tx.purchase.update({
      where: { id: purchaseId },
      data: { outcome: OutcomeType.DELIVERY, resolvedAt: new Date() },
    })

    return { order, purchase }
  })

  // Send emails
  try {
    const addrStr = [
      order.order.addressLine1,
      order.order.addressLine2,
      order.order.city,
      order.order.state,
      order.order.postcode,
      order.order.country,
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

// GET /api/orders - buyer's order history
export async function GET() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const purchases = await prisma.purchase.findMany({
    where: { buyerId: user.id },
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
    createdAt: p.createdAt,
    order: p.order ? {
      status: p.order.status,
      trackingNumber: p.order.trackingNumber,
    } : null,
  })))
}
