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
    const certNum = certNumber.trim()

    // Fetch cert data from PSA API
    const apiRes = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNum}`, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const text = await apiRes.text()
    let data: any
    try { data = JSON.parse(text) } catch { return err('PSA returned unexpected response') }

    if (data.IsValidRequest === false) return err(data.ServerMessage || 'Invalid cert number')
    if (data.ServerMessage === 'No data found') return err('No card found for this cert number')

    const cert = data.PSACert ?? data.PSACard ?? data.Cert
    if (!cert) return err('No card data found for this cert number')

    const grade = cert.CardGrade ?? cert.GradeDescription ?? cert.PSAGrade

    const parts = [
      cert.Year,
      cert.Brand,
      cert.Subject,
      cert.Variety,
      cert.CardNumber ? `#${cert.CardNumber}` : null,
      grade ? `PSA ${grade}` : null,
    ].filter(Boolean)

    const itemName = parts.join(' ') || `PSA Cert #${certNum}`

    // Try known PSA image URL formats
    let imageUrl: string | null = null
    const candidateUrls = [
      `https://cert-images.psa.com/${certNum}/large/${certNum}_f.jpg`,
      `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNum}/large/${certNum}_f.jpg`,
      `https://i.psacard.com/cert/${certNum}/${certNum}_f.jpg`,
      `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNum}/${certNum}_f.jpg`,
    ]
    for (const url of candidateUrls) {
      try {
        const imgRes = await fetch(url, { method: 'HEAD' })
        if (imgRes.ok) { imageUrl = url; break }
      } catch {}
    }

    return ok({
      certNumber: certNum,
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