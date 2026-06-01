import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const { searchParams } = new URL(req.url)
  const certNumber = searchParams.get('cert')
  if (!certNumber) return err('Cert number required')

  const token = process.env.PSA_API_TOKEN
  if (!token) return err('PSA API not configured')

  try {
    const res = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber}`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) return err('PSA cert not found', 404)

    const data = await res.json()
    const cert = data.PSACert

    if (!cert || !data.IsValidRequest) return err('Invalid PSA cert number')

    // Build item name from card details
    const parts = [
      cert.Year,
      cert.Brand,
      cert.Subject,
      cert.CardNumber ? `#${cert.CardNumber}` : null,
      cert.GradeDescription ? `PSA ${cert.GradeDescription}` : cert.PSAGrade ? `PSA ${cert.PSAGrade}` : null,
    ].filter(Boolean)

    const itemName = parts.join(' ')

    // Get front image URL
    const imageUrl = cert.CertImageFront
      ? `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNumber}/large/${certNumber}_f.jpg`
      : null

    return ok({
      certNumber,
      itemName,
      grade: cert.PSAGrade,
      gradeDescription: cert.GradeDescription,
      year: cert.Year,
      brand: cert.Brand,
      subject: cert.Subject,
      cardNumber: cert.CardNumber,
      sport: cert.Sport,
      imageUrl,
      rawCert: cert,
    })
  } catch (e) {
    console.error('PSA lookup error:', e)
    return err('Failed to lookup PSA cert')
  }
}