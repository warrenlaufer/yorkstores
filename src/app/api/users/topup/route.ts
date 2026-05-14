import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { createPaymentIntent, createOrRetrieveCustomer } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { topupSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = topupSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { amount } = parsed.data

  // Get or create Stripe customer
  let customerId = user.stripeCustomerId
  if (!customerId) {
    const customer = await createOrRetrieveCustomer(user.email, user.name)
    customerId = customer.id
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } })
  }

  const pi = await createPaymentIntent(amount, customerId)

  // Record pending topup
  await prisma.walletTopup.create({
    data: {
      userId: user.id,
      amount,
      stripePaymentIntentId: pi.id,
      status: 'pending',
    },
  })

  return ok({
    clientSecret: pi.client_secret,
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    amount,
  })
}
