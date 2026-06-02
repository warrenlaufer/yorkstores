import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import Stripe from 'stripe'
import { z } from 'zod'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

const schema = z.object({
  amount: z.number().int().min(100).max(100000), // in cents
})

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { amount } = parsed.data

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Yorkstores Wallet Top-up',
            description: `Add $${(amount / 100).toFixed(2)} to your Yorkstores wallet`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      amountDollars: (amount / 100).toFixed(2),
    },
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?success=1`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/wallet?cancelled=1`,
  })

  return ok({ url: session.url })
}