import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { resetPasswordSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { token, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { resetToken: token } })

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    return err('Reset link is invalid or has expired')
  }

  const passwordHash = await hashPassword(password)

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, resetToken: null, resetTokenExpiry: null },
  })

  // Invalidate all existing sessions
  await prisma.session.deleteMany({ where: { userId: user.id } })

  return ok({ reset: true })
}
