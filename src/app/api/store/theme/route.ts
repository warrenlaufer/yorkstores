import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'
import { z } from 'zod'

const schema = z.object({
  primaryColor:    z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  cardColor:       z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  textColor:       z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  accentColor:     z.string().regex(/^#[0-9A-Fa-f]{6}$/),
})

export async function GET() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const theme = await prisma.storeTheme.findUnique({ where: { userId: user.id } })
  return ok(theme ?? {
    primaryColor: '#FF6B85',
    backgroundColor: '#08080B',
    cardColor: '#0F0F14',
    textColor: '#EEEEF5',
    accentColor: '#F5C842',
  })
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const theme = await prisma.storeTheme.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  })

  return ok(theme)
}