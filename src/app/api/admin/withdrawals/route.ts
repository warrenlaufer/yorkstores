import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'
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
    include: { user: { select: { name: true, email: true, role: true, company: true } } },
  })

  return ok(withdrawals.map(w => ({
    id: w.id,
    source: w.source,
    amount: Number(w.amount),
    status: w.status,
    createdAt: w.createdAt.toISOString(),
    processedAt: w.processedAt?.toISOString() ?? null,
    user: { name: w.user.name, email: w.user.email, role: w.user.role, company: w.user.company },
  })))
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.findUnique({ where: { id: parsed.data.id } })
      if (!w) throw new Error('NOT_FOUND')
      if (w.status !== 'PENDING') throw new Error('ALREADY_PROCESSED')

      const amount = Number(w.amount)

      if (parsed.data.action === 'reject') {
        // Refund the held balance back to the user.
        if (w.source === 'buyer') {
          await tx.user.update({
            where: { id: w.userId },
            data: { cashBalance: { increment: amount }, walletBalance: { increment: amount } },
          })
        } else {
          await tx.user.update({
            where: { id: w.userId },
            data: { storeBalance: { increment: amount } },
          })
          const owner = await tx.user.findUnique({ where: { id: w.userId }, select: { storeBalance: true } })
          if (owner && Number(owner.storeBalance) >= 0) {
            await tx.drop.updateMany({ where: { ownerId: w.userId, isActive: false }, data: { isActive: true } })
          }
        }
        await tx.transaction.create({
          data: { userId: w.userId, type: 'withdrawal_rejected', description: `Withdrawal rejected — refunded (${w.source})`, amount },
        })
      }

      return tx.withdrawal.update({
        where: { id: w.id },
        data: { status: parsed.data.action === 'approve' ? 'PAID' : 'REJECTED', processedAt: new Date() },
      })
    })

    return ok({ id: updated.id, status: updated.status })
  } catch (e: any) {
    if (e.message === 'NOT_FOUND') return err('Withdrawal not found')
    if (e.message === 'ALREADY_PROCESSED') return err('This withdrawal has already been processed')
    console.error('Admin withdrawal error:', e)
    return err('Action failed — please try again')
  }
}
