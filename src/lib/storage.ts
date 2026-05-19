import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function generateUploadUrl(mimeType: string) {
  if (!ALLOWED_TYPES.includes(mimeType)) {
    throw new Error('File type not allowed. Use JPEG, PNG, WebP, or GIF.')
  }

  const ext = mimeType.split('/')[1].replace('jpeg', 'jpg')
  const key = `items/${uuidv4()}.${ext}`

  const url = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: mimeType,
    }),
    {
      expiresIn: 300,
      unhoistableHeaders: new Set(['x-amz-checksum-crc32', 'x-amz-sdk-checksum-algorithm']),
    }
  )

  return { uploadUrl: url, publicUrl: `${PUBLIC_URL}/${key}`, key }
}

export async function deleteFile(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
