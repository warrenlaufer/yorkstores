import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

function isBusinessDay(date: Date) {
  const day = date.getDay()
  return day !== 0 && day !== 6
}

function addBusinessDays(date: Date, days: number): Date {
  let count = 0
  const d = new Date(date)
  while (count < days) {
    d.setDate(d.getDate() + 1)
    if (isBusinessDay(d)) count++
  }
  return d
}

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const now = new Date()

  // Get all pending delivery orders
  const pendingOrders = await prisma.order.findMany({
    where: { status: 'PENDING' },
    include: {
      purchase: {
        include: {
          box: { include: { drop: { include: { owner: true } } } },
          buyer: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  if (pendingOrders.length === 0) return ok({ sent: 0 })

  // Group by store owner
  const byOwner: Record<string, { owner: { name: string; email: string }; orders: typeof pendingOrders }> = {}
  for (const order of pendingOrders) {
    const owner = order.purchase.box.drop.owner
    if (!byOwner[owner.id]) byOwner[owner.id] = { owner: { name: owner.name, email: owner.email }, orders: [] }
    byOwner[owner.id].orders.push(order)
  }

  let emailsSent = 0
  const overdueOrders: typeof pendingOrders = []

  // Send daily reminder to each store owner
  for (const { owner, orders } of Object.values(byOwner)) {
    const orderList = orders.map(o => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${o.purchase.box.itemName}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${o.purchase.buyer.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${o.recipientName}, ${o.city}, ${o.country}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
      </tr>
    `).join('')

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: owner.email,
        subject: `📦 You have ${orders.length} order${orders.length > 1 ? 's' : ''} awaiting shipment — Yorkstores`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#08080B;color:#EEEEF5;padding:2rem;border-radius:12px;">
            <h2 style="color:#FF6B85;margin-bottom:0.5rem;">Pending Shipments</h2>
            <p style="color:#9898B0;margin-bottom:1.5rem;">Hi ${owner.name}, you have ${orders.length} order${orders.length > 1 ? 's' : ''} waiting to be shipped.</p>
            <table style="width:100%;border-collapse:collapse;background:#0F0F14;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#1D1D26;">
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Item</th>
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Buyer</th>
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Ship To</th>
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Order Date</th>
                </tr>
              </thead>
              <tbody>${orderList}</tbody>
            </table>
            <p style="margin-top:1.5rem;color:#9898B0;font-size:0.85rem;">Please mark orders as shipped in your <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/fulfilment" style="color:#FF6B85;">Fulfilment Dashboard</a> once dispatched.</p>
          </div>
        `,
      })
      emailsSent++
    } catch (e) {
      console.error(`Failed to send reminder to ${owner.email}:`, e)
    }

    // Check for overdue orders (3+ business days)
    for (const order of orders) {
      const deadline = addBusinessDays(new Date(order.createdAt), 3)
      if (now > deadline) overdueOrders.push(order)
    }
  }

  // Send admin alert for overdue orders
  if (overdueOrders.length > 0) {
    const overdueList = overdueOrders.map(o => `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${o.purchase.box.itemName}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${o.purchase.box.drop.owner.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${o.purchase.buyer.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;">${new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #1D1D26;color:#FF8FA3;">Overdue</td>
      </tr>
    `).join('')

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: 'admin@yorkstores.com',
        subject: `⚠️ ${overdueOrders.length} overdue shipment${overdueOrders.length > 1 ? 's' : ''} — Yorkstores Admin`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#08080B;color:#EEEEF5;padding:2rem;border-radius:12px;">
            <h2 style="color:#FF6B85;margin-bottom:0.5rem;">⚠️ Overdue Shipments</h2>
            <p style="color:#9898B0;margin-bottom:1.5rem;">The following orders have not been shipped after 3 business days.</p>
            <table style="width:100%;border-collapse:collapse;background:#0F0F14;border-radius:8px;overflow:hidden;">
              <thead>
                <tr style="background:#1D1D26;">
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Item</th>
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Store</th>
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Buyer</th>
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Order Date</th>
                  <th style="padding:8px 12px;text-align:left;font-size:0.75rem;color:#9898B0;">Status</th>
                </tr>
              </thead>
              <tbody>${overdueList}</tbody>
            </table>
          </div>
        `,
      })
    } catch (e) {
      console.error('Failed to send admin overdue alert:', e)
    }
  }

  return ok({ sent: emailsSent, overdue: overdueOrders.length })
}