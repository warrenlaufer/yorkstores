import { NextRequest } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return new Response('Webhook secret not configured', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (e: any) {
    console.error('Webhook signature verification failed:', e.message)
    return new Response(`Webhook Error: ${e.message}`, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    if (session.payment_status !== 'paid') return new Response('Not paid', { status: 200 })

    const userId = session.metadata?.userId
    const amountDollars = parseFloat(session.metadata?.amountDollars ?? '0')

    if (!userId || !amountDollars) {
      console.error('Missing metadata:', session.metadata)
      return new Response('Missing metadata', { status: 400 })
    }

    const existing = await prisma.walletTopup.findUnique({
      where: { stripePaymentIntentId: session.payment_intent as string },
    })
    if (existing) return new Response('Already processed', { status: 200 })

    await prisma.$transaction([
      // Top-ups go to cashBalance only
      prisma.user.update({
        where: { id: userId },
        data: {
          walletBalance: { increment: amountDollars },
          cashBalance: { increment: amountDollars },
        },
      }),
      prisma.walletTopup.create({
        data: {
          userId,
          amount: amountDollars,
          stripePaymentIntentId: session.payment_intent as string,
          status: 'completed',
        },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'topup',
          description: 'Wallet top-up via Stripe',
          amount: amountDollars,
        },
      }),
    ])

    console.log(`Wallet topped up: ${userId} +$${amountDollars} (cash)`)
  }

  return new Response('OK', { status: 200 })
}