import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import Stripe from 'stripe'
import { Role } from '@prisma/client'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const schema = z.object({
  amount: z.number().int().min(100).max(100000), // in cents
  target: z.enum(['wallet', 'store']).optional().default('wallet'),
  promoCode: z.string().max(64).optional(),
})

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { amount, target, promoCode } = parsed.data

  if (target === 'store' && user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) {
    return err('Only store owners can top up a store balance', 403)
  }

  // Validate an optional deposit-match code (wallet top-ups only).
  let matchPromoId: string | null = null
  if (target === 'wallet' && promoCode && promoCode.trim()) {
    const code = promoCode.trim().toUpperCase()
    const promo = await prisma.promoCode.findUnique({
      where: { code },
      include: { redemptions: { where: { userId: user.id } } },
    })
    if (!promo || !promo.isActive) return err('Invalid match code')
    if (promo.type !== 'match') return err('That code is not a deposit-match code')
    if (promo.expiresAt && promo.expiresAt < new Date()) return err('This match code has expired')
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return err('This match code has reached its usage limit')
    if (promo.redemptions.length > 0) return err('You have already used this match code')
    matchPromoId = promo.id
  }

  const isStore = target === 'store'
  const redirectPath = isStore ? '/dashboard/store' : '/dashboard/wallet'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: isStore ? 'Yorkstores Store Top-up' : 'Yorkstores Wallet Top-up',
            description: `Add $${(amount / 100).toFixed(2)} to your Yorkstores ${isStore ? 'store balance' : 'wallet'}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      amountDollars: (amount / 100).toFixed(2),
      target,
      ...(matchPromoId ? { promoCodeId: matchPromoId } : {}),
    },
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}${redirectPath}?cancelled=1`,
  })

  return ok({ url: session.url })
}