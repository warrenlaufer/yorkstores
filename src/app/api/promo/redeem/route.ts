import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({ code: z.string().min(1).max(64) })

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err('Invalid code')

  const code = parsed.data.code.trim().toUpperCase()

  const promo = await prisma.promoCode.findUnique({
    where: { code },
    include: { redemptions: { where: { userId: user.id } } },
  })

  if (!promo || !promo.isActive) return err('Invalid or expired promo code')
  if (promo.type === 'match') return err('This is a deposit-match code — enter it on the Top Up screen when adding funds')
  if (promo.expiresAt && promo.expiresAt < new Date()) return err('This promo code has expired')
  if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) return err('This promo code has reached its usage limit')
  if (promo.redemptions.length > 0) return err('You have already used this promo code')

  const amount = Number(promo.amount)

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        walletBalance: { increment: amount },
        promoBalance: { increment: amount },
        // cashBalance unchanged — promo credits are not withdrawable
      },
    }),
    prisma.promoRedemption.create({
      data: { promoCodeId: promo.id, userId: user.id },
    }),
    prisma.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'promo',
        description: `Promo code: ${code}${promo.description ? ' — ' + promo.description : ''}`,
        amount,
      },
    }),
  ])

  return ok({
    amount,
    message: `$${amount.toFixed(2)} added to your wallet!`,
  })
}