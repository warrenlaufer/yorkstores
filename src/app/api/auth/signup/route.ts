import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { hashPassword, createSession, SESSION_COOKIE, SESSION_DURATION } from '@/lib/auth'
import { ok, err, limiter } from '@/lib/api'
import { signUpSchema } from '@/lib/schemas'
import { sendWelcomeEmail } from '@/lib/email'
import { Role } from '@prisma/client'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!limiter(ip + ':signup', 5, 60_000)) return err('Too many requests', 429)

  const body = await req.json().catch(() => null)
  const parsed = signUpSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const { name, email, password, role, company, inviteCode } = parsed.data

  const STORE_INVITE_CODE = (process.env.STORE_INVITE_CODE ?? 'STOREFRONT').toUpperCase()
  if (role === 'STORE_OWNER' && (inviteCode ?? '').trim().toUpperCase() !== STORE_INVITE_CODE) {
    return err('Invalid seller invite code')
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return err('An account with this email already exists')

  const passwordHash = await hashPassword(password)

  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: role as Role,
      company: role === 'STORE_OWNER' ? company : undefined,
      walletBalance: 0,
      storeBalance: 0,
      emailVerified: true,
    },
  })

  const { jwt, expiresAt } = await createSession(user.id)

  cookies().set(SESSION_COOKIE, jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: expiresAt,
    path: '/',
  })

  try {
    await sendWelcomeEmail(user.email, user.name)
  } catch (e) {
    console.error('Welcome email failed:', e)
  }

  return ok({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, company: user.company },
  }, 201)
}