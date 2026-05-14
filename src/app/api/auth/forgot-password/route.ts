import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateResetToken, hashPassword } from '@/lib/auth'
import { ok, err, limiter } from '@/lib/api'
import { forgotPasswordSchema, resetPasswordSchema } from '@/lib/schemas'
import { sendPasswordResetEmail } from '@/lib/email'

// POST /api/auth/forgot-password
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!limiter(ip + ':forgot', 3, 60_000)) return err('Too many requests', 429)

  const body = await req.json().catch(() => null)
  const parsed = forgotPasswordSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })

  // Always return ok to prevent email enumeration
  if (!user) return ok({ sent: true })

  const token = await generateResetToken()
  const expiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await prisma.user.update({
    where: { id: user.id },
    data: { resetToken: token, resetTokenExpiry: expiry },
  })

  try {
    await sendPasswordResetEmail(user.email, user.name, token)
  } catch (e) {
    console.error('Reset email failed:', e)
  }

  return ok({ sent: true })
}
