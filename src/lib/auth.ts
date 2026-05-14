import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
)

export const SESSION_COOKIE = 'ys_session'
export const SESSION_DURATION = 60 * 60 * 24 * 30 // 30 days

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(hash: string, password: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000)

  await prisma.session.create({ data: { userId, token, expiresAt } })

  const jwt = await new SignJWT({ token })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(secret)

  return { jwt, expiresAt }
}

export async function getSession() {
  try {
    const cookieStore = cookies()
    const jwt = cookieStore.get(SESSION_COOKIE)?.value
    if (!jwt) return null

    const { payload } = await jwtVerify(jwt, secret)
    const token = payload.token as string

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    })

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { token } })
      return null
    }

    return session.user
  } catch {
    return null
  }
}

export async function deleteSession() {
  try {
    const cookieStore = cookies()
    const jwt = cookieStore.get(SESSION_COOKIE)?.value
    if (!jwt) return

    const { payload } = await jwtVerify(jwt, secret)
    const token = payload.token as string
    await prisma.session.deleteMany({ where: { token } })
  } catch {}
}

export async function generateResetToken() {
  return randomBytes(32).toString('hex')
}

export async function cleanExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
}
