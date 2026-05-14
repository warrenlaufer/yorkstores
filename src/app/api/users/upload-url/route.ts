import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { generateUploadUrl } from '@/lib/storage'
import { Role } from '@prisma/client'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const mimeType = body?.mimeType as string

  if (!mimeType) return err('mimeType is required')

  try {
    const result = await generateUploadUrl(mimeType)
    return ok(result)
  } catch (e: any) {
    return err(e.message)
  }
}
