import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'
import { createTransfer } from '@/lib/stripe'
import { z } from 'zod'

const actionSchema = z.object({
  id: z.string().min(1),
  action: z.enum(['approve', 'reject']),
})

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const withdrawals = await prisma.withdrawal.findMany({
    where: status ? { status: status as any } : {},
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { user: { select: { name: true, email: true, role: true, company: true, payoutsEnabled: true, stripeAccountId: true } } },
  })

  return ok(withdrawals.map(w => ({
    id: w.id,
    source: w.source,
    amount: Number(w.amount),
    status: w.status,
    createdAt: w.createdAt.toISOString(),
    processedAt: w.processedAt?.toISOString() ?? null,
    user: {
      name: w.user.name,
      email: w.user.email,
      role: w.user.role,
      company: w.user.company,
      payoutsReady: !!(w.user.payoutsEnabled && w.user.stripeAccountId),
    },
  })))
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const w = await prisma.withdrawal.findUnique({ where: { id: parsed.data.id } })
  if (!w) return err('Withdrawal not found')
  if (w.status !== 'PENDING') return err('This withdrawal has already been processed')

  const amount = Number(w.amount)

  // Reject → refund the held balance and mark rejected.
  if (parsed.data.action === 'reject') {
    try {
      await prisma.$transaction(async (tx) => {
        if (w.source === 'buyer') {
          const restorePromo = Number(w.forfeitedPromo)
          await tx.user.update({
            where: { id: w.userId },
            data: {
              cashBalance: { increment: amount },
              promoBalance: { increment: restorePromo },
              walletBalance: { increment: amount + restorePromo },
            },
          })
          if (restorePromo > 0) {
            await tx.transaction.create({
              data: { userId: w.userId, type: 'promo_restored', description: 'Promo credit restored (withdrawal rejected)', amount: restorePromo },
            })
          }
        } else {
          await tx.user.update({ where: { id: w.userId }, data: { storeBalance: { increment: amount } } })
          const owner = await tx.user.findUnique({ where: { id: w.userId }, select: { storeBalance: true } })
          if (owner && Number(owner.storeBalance) >= 0) {
            await tx.drop.updateMany({ where: { ownerId: w.userId, isActive: false }, data: { isActive: true } })
          }
        }
        await tx.transaction.create({
          data: { userId: w.userId, type: 'withdrawal_rejected', description: `Withdrawal rejected — refunded (${w.source})`, amount },
        })
        await tx.withdrawal.update({ where: { id: w.id }, data: { status: 'REJECTED', processedAt: new Date() } })
      })
      return ok({ id: w.id, status: 'REJECTED' })
    } catch (e) {
      console.error('Withdrawal reject error:', e)
      return err('Could not reject — please try again')
    }
  }

  // Approve → pay out via a Stripe Connect transfer to the user's connected account.
  const recipient = await prisma.user.findUnique({
    where: { id: w.userId },
    select: { stripeAccountId: true, payoutsEnabled: true },
  })
  if (!recipient?.stripeAccountId || !recipient.payoutsEnabled) {
    return err('This user has not finished Stripe payout onboarding, so funds can\u2019t be sent yet.')
  }

  try {
    // idempotencyKey keyed on the withdrawal id prevents a double payout on retry.
    const transfer = await createTransfer(recipient.stripeAccountId, amount, `wd_${w.id}`, `Yorkstores withdrawal (${w.source})`)
    await prisma.withdrawal.update({
      where: { id: w.id },
      data: { status: 'PAID', processedAt: new Date(), stripeTransferId: transfer.id },
    })
    await prisma.transaction.create({
      data: { userId: w.userId, type: 'withdrawal_paid', description: `Withdrawal paid out (${w.source})`, amount: 0 },
    })
    return ok({ id: w.id, status: 'PAID' })
  } catch (e: any) {
    console.error('Transfer failed:', e?.message)
    return err('Stripe transfer failed: ' + (e?.message ?? 'unknown error'))
  }
}
