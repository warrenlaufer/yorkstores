import { NextRequest, NextResponse } from 'next/server'
import { getSession } from './auth'
import { Role } from '@prisma/client'

type Handler = (req: NextRequest, user: Awaited<ReturnType<typeof getSession>>) => Promise<NextResponse>

export function withAuth(handler: Handler) {
  return async (req: NextRequest) => {
    const user = await getSession()
    if (!user) return err('Unauthorized', 401)
    return handler(req, user)
  }
}

export function withRole(role: Role, handler: Handler) {
  return async (req: NextRequest) => {
    const user = await getSession()
    if (!user) return err('Unauthorized', 401)
    if (user.role !== role && user.role !== Role.ADMIN) return err('Forbidden', 403)
    return handler(req, user)
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export function rateLimit() {
  const map = new Map<string, { count: number; reset: number }>()
  return (key: string, limit = 10, windowMs = 60_000) => {
    const now = Date.now()
    const entry = map.get(key) ?? { count: 0, reset: now + windowMs }
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs }
    entry.count++
    map.set(key, entry)
    return entry.count <= limit
  }
}

export const limiter = rateLimit()
