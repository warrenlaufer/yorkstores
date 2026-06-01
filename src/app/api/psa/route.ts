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
    const res = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber.trim()}`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const data = await res.json()
    console.log('PSA API response:', JSON.stringify(data).slice(0, 500))

    if (!data.IsValidRequest) {
      return err(data.ServerMessage || 'Invalid cert number')
    }

    if (data.ServerMessage === 'No data found') {
      return err('No card found for this cert number')
    }

    // The cert data can be in different keys depending on the item type
    const cert = data.PSACert ?? data.PSACard ?? data.Cert ?? data

    if (!cert) return err('Could not parse PSA response')

    // Build item name from available fields
    const parts = [
      cert.Year ?? cert.year,
      cert.Brand ?? cert.brand,
      cert.Subject ?? cert.subject ?? cert.PlayerName,
      cert.CardNumber ? `#${cert.CardNumber}` : null,
      cert.PSAGrade ? `PSA ${cert.PSAGrade}` : null,
    ].filter(Boolean)

    const itemName = parts.join(' ') || `PSA Cert #${certNumber}`

    // Try multiple image URL formats
    const imageUrl = cert.CertImageFront
      ? `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNumber}/large/${certNumber}_f.jpg`
      : cert.ImageURL ?? null

    return ok({
      certNumber,
      itemName,
      grade: cert.PSAGrade ?? cert.Grade,
      gradeDescription: cert.GradeDescription,
      year: cert.Year ?? cert.year,
      brand: cert.Brand ?? cert.brand,
      subject: cert.Subject ?? cert.subject ?? cert.PlayerName,
      cardNumber: cert.CardNumber,
      sport: cert.Sport ?? cert.Category,
      imageUrl,
      rawCert: cert,
    })
  } catch (e) {
    console.error('PSA lookup error:', e)
    return err('Failed to lookup PSA cert')
  }
}