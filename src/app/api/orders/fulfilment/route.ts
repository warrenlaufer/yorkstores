import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { shipOrderSchema } from '@/lib/schemas'
import { sendShippingNotificationEmail } from '@/lib/email'
import { Role, OrderStatus } from '@prisma/client'

// GET /api/orders/fulfilment - store owner's pending orders
export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const status = req.nextUrl.searchParams.get('status') as OrderStatus | null

  const orders = await prisma.order.findMany({
    where: {
      drop: { ownerId: user.role === Role.ADMIN ? undefined : user.id },
      ...(status ? { status } : {}),
    },
    include: {
      buyer: { select: { name: true, email: true } },
      purchase: { include: { box: true } },
      drop: { select: { name: true, emoji: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(orders.map(o => ({
    id: o.id,
    status: o.status,
    itemName: o.purchase.box.itemName,
    itemPrice: Number(o.purchase.box.itemPrice),
    shippingCost: Number(o.purchase.box.itemShippingCost),
    dropName: o.drop.name,
    buyerName: o.buyer.name,
    buyerEmail: o.buyer.email,
    recipientName: o.recipientName,
    recipientEmail: o.recipientEmail,
    address: {
      line1: o.addressLine1,
      line2: o.addressLine2,
      city: o.city,
      state: o.state,
      postcode: o.postcode,
      country: o.country,
    },
    trackingNumber: o.trackingNumber,
    createdAt: o.createdAt,
    shippedAt: o.shippedAt,
  })))
}

// POST /api/orders/fulfilment - mark as shipped
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const parsed = shipOrderSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { orderId, trackingNumber, carrier } = parsed.data

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      drop: true,
      buyer: true,
      purchase: { include: { box: true } },
    },
  })

  if (!order) return err('Order not found', 404)
  if (order.drop.ownerId !== user.id && user.role !== Role.ADMIN) return err('Forbidden', 403)
  if (order.status === OrderStatus.SHIPPED) return err('Order already shipped')

  await prisma.order.update({
    where: { id: orderId },
    data: { status: OrderStatus.SHIPPED, trackingNumber, shippedAt: new Date() },
  })

  try {
    await sendShippingNotificationEmail(order.recipientEmail, order.buyer.name, {
      itemName: order.purchase.box.itemName,
      trackingNumber,
      carrier,
    })
  } catch (e) {
    console.error('Shipping email failed:', e)
  }

  return ok({ shipped: true, trackingNumber })
}
