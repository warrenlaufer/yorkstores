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

  const certNum = certNumber.trim()
  const headers = {
    'Authorization': `bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
    // Fetch cert details and images in parallel
    const [certRes, imgRes] = await Promise.all([
      fetch(`https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNum}`, { headers }),
      fetch(`https://api.psacard.com/publicapi/cert/GetImagesByCertNumber/${certNum}`, { headers }),
    ])

    const certText = await certRes.text()
    let data: any
    try { data = JSON.parse(certText) } catch { return err('PSA returned unexpected response') }

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

    // Get front image from images endpoint
    let imageUrl: string | null = null
    try {
      if (imgRes.ok) {
        const imgData = await imgRes.json()
        if (Array.isArray(imgData) && imgData.length > 0) {
          const front = imgData.find((i: any) => i.IsFrontImage === true) ?? imgData[0]
          imageUrl = front?.ImageURL ?? null
        }
      }
    } catch (e) {
      console.error('PSA image fetch failed:', e)
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