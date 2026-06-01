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

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { return err(`PSA returned unexpected response`) }

    // Handle explicit invalid request
    if (data.IsValidRequest === false) {
      return err(data.ServerMessage || 'Invalid cert number')
    }

    // Handle no data found
    if (data.ServerMessage === 'No data found') {
      return err('No card found for this cert number')
    }

    // Extract cert — could be PSACert, PSACard, or direct
    const cert = data.PSACert ?? data.PSACard ?? data.Cert
    if (!cert) return err('No card data found for this cert number')

    // Grade is in CardGrade or GradeDescription
    const grade = cert.CardGrade ?? cert.GradeDescription ?? cert.PSAGrade

    // Build item name
    const parts = [
      cert.Year,
      cert.Brand,
      cert.Subject,
      cert.Variety,
      cert.CardNumber ? `#${cert.CardNumber}` : null,
      grade ? `PSA ${grade}` : null,
    ].filter(Boolean)

    const itemName = parts.join(' ') || `PSA Cert #${certNumber}`

    // Image URL
    const imageUrl = `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNumber.trim()}/large/${certNumber.trim()}_f.jpg`

    return ok({
      certNumber,
      itemName,
      grade,
      gradeDescription: cert.GradeDescription,
      year: cert.Year,
      brand: cert.Brand,
      subject: cert.Subject,
      variety: cert.Variety,
      cardNumber: cert.CardNumber,
      category: cert.Category,
      imageUrl,
    })
  } catch (e: any) {
    return err('Failed to lookup PSA cert: ' + e.message)
  }
}