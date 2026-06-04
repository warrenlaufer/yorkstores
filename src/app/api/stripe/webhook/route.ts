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
    const target = session.metadata?.target ?? 'wallet'

    if (!userId || !amountDollars) {
      console.error('Missing metadata:', session.metadata)
      return new Response('Missing metadata', { status: 400 })
    }

    const existing = await prisma.walletTopup.findUnique({
      where: { stripePaymentIntentId: session.payment_intent as string },
    })
    if (existing) return new Response('Already processed', { status: 200 })

    if (target === 'store') {
      // Store top-up → storeBalance
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { storeBalance: { increment: amountDollars } },
        }),
        prisma.walletTopup.create({
          data: { userId, amount: amountDollars, stripePaymentIntentId: session.payment_intent as string, status: 'completed' },
        }),
        prisma.transaction.create({
          data: { userId, type: 'store_topup', description: 'Store balance top-up via Stripe', amount: amountDollars },
        }),
      ])
      // If this restores the store to solvent, lift any suspension.
      const owner = await prisma.user.findUnique({ where: { id: userId }, select: { storeBalance: true } })
      if (owner && Number(owner.storeBalance) >= 0) {
        await prisma.drop.updateMany({ where: { ownerId: userId, isActive: false }, data: { isActive: true } })
      }
      console.log(`Store topped up: ${userId} +$${amountDollars}`)
    } else {
      // Wallet top-up → cashBalance only
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: {
            walletBalance: { increment: amountDollars },
            cashBalance: { increment: amountDollars },
          },
        }),
        prisma.walletTopup.create({
          data: { userId, amount: amountDollars, stripePaymentIntentId: session.payment_intent as string, status: 'completed' },
        }),
        prisma.transaction.create({
          data: { userId, type: 'topup', description: 'Wallet top-up via Stripe', amount: amountDollars },
        }),
      ])
      console.log(`Wallet topped up: ${userId} +$${amountDollars} (cash)`)

      // Deposit-match promo: grant matching promo credit if a valid match code rode along.
      const promoCodeId = session.metadata?.promoCodeId
      if (promoCodeId) {
        const promo = await prisma.promoCode.findUnique({
          where: { id: promoCodeId },
          include: { redemptions: { where: { userId } } },
        })
        if (
          promo && promo.isActive && promo.type === 'match' &&
          (!promo.expiresAt || promo.expiresAt >= new Date()) &&
          (promo.maxUses === null || promo.usedCount < promo.maxUses) &&
          promo.redemptions.length === 0
        ) {
          const cap = Number(promo.amount)
          const match = Math.min(Math.round(amountDollars * (promo.matchPct / 100) * 100) / 100, cap)
          if (match > 0) {
            await prisma.$transaction([
              prisma.user.update({ where: { id: userId }, data: { walletBalance: { increment: match }, promoBalance: { increment: match } } }),
              prisma.promoRedemption.create({ data: { promoCodeId: promo.id, userId } }),
              prisma.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } }),
              prisma.transaction.create({ data: { userId, type: 'promo_match', description: `Deposit match (${promo.code}): +$${match.toFixed(2)} promo`, amount: match } }),
            ])
            console.log(`Deposit match: ${userId} +$${match} promo (${promo.code})`)
          }
        }
      }
    }
  }

  return new Response('OK', { status: 200 })
}