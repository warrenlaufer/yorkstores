import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      company: true,
      walletBalance: true,
      storeBalance: true,
      emailVerified: true,
      createdAt: true,
      _count: { select: { purchases: true, drops: true } },
    },
  })

  return ok(users.map(u => ({
    ...u,
    walletBalance: Number(u.walletBalance),
    storeBalance: Number(u.storeBalance),
  })))
}
