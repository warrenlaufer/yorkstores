import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { z } from 'zod'
import { Role } from '@prisma/client'

const schema = z.object({
  code: z.string().min(2).max(32).toUpperCase(),
  type: z.enum(['fixed', 'match']).default('fixed'),
  amount: z.number().positive(),
  matchPct: z.number().int().min(1).max(1000).optional(),
  description: z.string().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().optional(),
})

export async function GET() {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const codes = await prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  })

  return ok(codes)
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err('Invalid data: ' + parsed.error.issues[0]?.message)

  const { code, type, amount, matchPct, description, maxUses, expiresAt } = parsed.data

  const existing = await prisma.promoCode.findUnique({ where: { code } })
  if (existing) return err('A promo code with that name already exists')

  const promo = await prisma.promoCode.create({
    data: {
      code,
      type,
      amount,
      matchPct: type === 'match' ? (matchPct ?? 100) : 100,
      description,
      maxUses: maxUses ?? null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  })

  return ok(promo)
}

export async function DELETE(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const { id } = await req.json()
  if (!id) return err('Missing id')

  await prisma.promoCode.update({ where: { id }, data: { isActive: false } })
  return ok({ disabled: true })
}