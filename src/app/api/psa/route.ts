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
    // Fetch cert data from PSA API
    const apiRes = await fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber.trim()}`, {
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

    const itemName = parts.join(' ') || `PSA Cert #${certNumber}`

    // Scrape PSA cert page for image URL
    let imageUrl: string | null = null
    try {
      const pageRes = await fetch(`https://www.psacard.com/cert/${certNumber.trim()}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      })
      const html = await pageRes.text()

      // Extract image URL from cloudfront
      const match = html.match(/https:\/\/d1htnxwo4o0jhw\.cloudfront\.net\/cert\/[^"'\s]+\.jpg/)
      if (match) imageUrl = match[0]

      // Fallback: look for cert-images pattern
      if (!imageUrl) {
        const match2 = html.match(/https:\/\/[^"'\s]*psacard[^"'\s]*\.(?:jpg|png|webp)/)
        if (match2) imageUrl = match2[0]
      }
    } catch (e) {
      console.error('PSA image scrape failed:', e)
    }

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