import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { err } from '@/lib/api'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { Role } from '@prisma/client'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return err('No file provided')
    if (!ALLOWED_TYPES.includes(file.type)) return err('File type not allowed. Use JPEG, PNG, WebP, or GIF.')
    if (file.size > 5 * 1024 * 1024) return err('File must be under 5MB')

    const ext = file.type.split('/')[1].replace('jpeg', 'jpg')
    const key = `items/${uuidv4()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    await r2.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: buffer,
      ContentType: file.type,
    }))

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    return NextResponse.json({ ok: true, data: { publicUrl, key } })
  } catch (e: any) {
    console.error('Upload error:', e)
    return err('Upload failed: ' + e.message)
  }
}