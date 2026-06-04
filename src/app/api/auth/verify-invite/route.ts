import { NextRequest } from 'next/server'
import { ok, err, limiter } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({ code: z.string().min(1).max(64) })

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? 'unknown'
  if (!limiter(ip + ':verify-invite', 10, 60_000)) return err('Too many attempts', 429)

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return err('Invalid invite code')

  const STORE_INVITE_CODE = (process.env.STORE_INVITE_CODE ?? 'STOREFRONT').toUpperCase()
  if (parsed.data.code.trim().toUpperCase() !== STORE_INVITE_CODE) {
    return err('Invalid invite code. Please check and try again.')
  }

  return ok({ valid: true })
}
