import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'
import { z } from 'zod'

const MIN_WITHDRAWAL = 10

const schema = z.object({
  amount: z.number().positive().max(100000),
  source: z.enum(['buyer', 'store']),
})

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const amount = Math.round(parsed.data.amount * 100) / 100
  const { source } = parsed.data

  if (amount < MIN_WITHDRAWAL) return err(`Minimum withdrawal is $${MIN_WITHDRAWAL}.`)

  if (source === 'store' && user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) {
    return err('Only store owners can withdraw store funds', 403)
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const me = await tx.user.findUnique({
        where: { id: user.id },
        select: { cashBalance: true, storeBalance: true, promoBalance: true },
      })
      if (!me) throw new Error('NOT_FOUND')

      let forfeitedPromo = 0
      if (source === 'buyer') {
        const cash = Number(me.cashBalance)
        if (cash < amount) throw new Error('INSUFFICIENT')
        // Withdrawing cash forfeits all promo credit.
        forfeitedPromo = Math.round(Number(me.promoBalance) * 100) / 100
        await tx.user.update({
          where: { id: user.id },
          data: {
            cashBalance: { decrement: amount },
            promoBalance: { set: 0 },
            walletBalance: { decrement: amount + forfeitedPromo },
          },
        })
        if (forfeitedPromo > 0) {
          await tx.transaction.create({
            data: { userId: user.id, type: 'promo_forfeited', description: 'Promo credit forfeited on withdrawal', amount: -forfeitedPromo },
          })
        }
      } else {
        const storeBalance = Number(me.storeBalance)
        const reservedAgg = await tx.purchase.aggregate({
          where: { drop: { ownerId: user.id }, outcome: null },
          _sum: { reservedAmt: true },
        })
        const reserved = Number(reservedAgg._sum?.reservedAmt ?? 0)
        const available = Math.round((storeBalance - reserved) * 100) / 100
        if (storeBalance < 0) throw new Error('SUSPENDED')
        if (available < amount) throw new Error('INSUFFICIENT_STORE')
        await tx.user.update({
          where: { id: user.id },
          data: { storeBalance: { decrement: amount } },
        })
      }

      const withdrawal = await tx.withdrawal.create({
        data: { userId: user.id, source, amount, status: 'PENDING', forfeitedPromo },
      })

      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'withdrawal_request',
          description: `Withdrawal requested (${source})`,
          amount: -amount,
        },
      })

      return withdrawal
    })

    return ok({ id: result.id, amount, status: result.status }, 201)
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return err('User not found')
    if (e.message === 'INSUFFICIENT') return err('Insufficient cash balance')
    if (e.message === 'INSUFFICIENT_STORE') return err('Insufficient available balance (funds may be reserved for buybacks)')
    if (e.message === 'SUSPENDED') return err('Your store balance is negative — withdrawals are unavailable until it is positive')
    console.error('Withdrawal error:', e)
    return err('Withdrawal request failed — please try again')
  }
}

export async function GET() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const withdrawals = await prisma.withdrawal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return ok(withdrawals.map(w => ({
    id: w.id,
    source: w.source,
    amount: Number(w.amount),
    status: w.status,
    createdAt: w.createdAt.toISOString(),
    processedAt: w.processedAt?.toISOString() ?? null,
  })))
}
