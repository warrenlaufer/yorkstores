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

  // Log env vars to help debug (remove after fixing)
  console.log('R2_ACCOUNT_ID:', process.env.R2_ACCOUNT_ID ? 'set' : 'MISSING')
  console.log('R2_ACCESS_KEY_ID:', process.env.R2_ACCESS_KEY_ID ? 'set' : 'MISSING')
  console.log('R2_SECRET_ACCESS_KEY:', process.env.R2_SECRET_ACCESS_KEY ? 'set' : 'MISSING')
  console.log('R2_BUCKET_NAME:', process.env.R2_BUCKET_NAME ?? 'MISSING')
  console.log('R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL ?? 'MISSING')

  try {
    const result = await generateUploadUrl(mimeType)
    return ok(result)
  } catch (e: any) {
    console.error('Upload URL error:', e.message)
    return err(e.message)
  }
}