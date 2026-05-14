import { cookies } from 'next/headers'
import { deleteSession, SESSION_COOKIE } from '@/lib/auth'
import { ok } from '@/lib/api'

export async function POST() {
  await deleteSession()
  cookies().delete(SESSION_COOKIE)
  return ok({ signedOut: true })
}
