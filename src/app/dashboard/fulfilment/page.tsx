import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Role, OrderStatus } from '@prisma/client'
import FulfilmentClient from '@/components/FulfilmentClient'

export const dynamic = 'force-dynamic'

export default async function FulfilmentPage() {
  const user = await getSession()
  if (!user) redirect('/signin')
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) redirect('/dashboard')

  const orders = await prisma.order.findMany({
    where: { drop: { ownerId: user.role === Role.ADMIN ? undefined : user.id } },
    include: {
      buyer: { select: { name: true, email: true } },
      purchase: { include: { box: true } },
      drop: { select: { name: true, emoji: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <FulfilmentClient
      orders={orders.map(o => ({
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
          line2: o.addressLine2 ?? undefined,
          city: o.city,
          state: o.state ?? undefined,
          postcode: o.postcode,
          country: o.country,
        },
        trackingNumber: o.trackingNumber ?? undefined,
        createdAt: o.createdAt.toISOString(),
      }))}
    />
  )
}
