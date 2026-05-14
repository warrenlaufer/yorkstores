import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyPassword, createSession, SESSION_COOKIE } from '@/lib/auth'
import { ok, err, limiter } from '@/lib/api'
import { signInSchema } from '@/lib/schemas'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!limiter(ip + ':signin', 10, 60_000)) return err('Too many requests', 429)

  const body = await req.json().catch(() => null)
  const parsed = signInSchema.safeParse(body)
  if (!parsed.success) return err('Invalid email or password')

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user) return err('Invalid email or password')

  const valid = await verifyPassword(user.passwordHash, password)
  if (!valid) return err('Invalid email or password')

  const { jwt, expiresAt } = await createSession(user.id)

  cookies().set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/',
  })

  return ok({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: user.company,
      walletBalance: Number(user.walletBalance),
      storeBalance: Number(user.storeBalance),
    },
  })
}
