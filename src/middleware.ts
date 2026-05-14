import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-in-production'
)

const PROTECTED_ROUTES = ['/dashboard', '/api/drops', '/api/orders', '/api/users']
const AUTH_ROUTES = ['/signin', '/signup']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))

  const token = req.cookies.get('ys_session')?.value

  let isAuthenticated = false
  if (token) {
    try {
      await jwtVerify(token, secret)
      isAuthenticated = true
    } catch {}
  }

  if (isProtected && !isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
}
