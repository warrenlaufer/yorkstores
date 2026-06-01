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
  const debug = searchParams.get('debug')
  if (!certNumber) return err('Cert number required')

  const token = process.env.PSA_API_TOKEN
  if (!token) return err('PSA API not configured')

  try {
    const url = `https://api.psacard.com/publicapi/cert/GetByCertNumber/${certNumber.trim()}`
    const res = await fetch(url, {
      headers: {
        'Authorization': `bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { return err(`PSA returned non-JSON: ${text.slice(0, 200)}`) }

    // Return raw response in debug mode
    if (debug === '1') return ok({ status: res.status, data })

    if (!data.IsValidRequest) {
      return err(data.ServerMessage || `Invalid request (status ${res.status})`)
    }

    if (data.ServerMessage === 'No data found') {
      return err('No card found for this cert number')
    }

    const cert = data.PSACert ?? data.PSACard ?? data.Cert ?? data

    const parts = [
      cert.Year ?? cert.year,
      cert.Brand ?? cert.brand,
      cert.Subject ?? cert.subject ?? cert.PlayerName,
      cert.CardNumber ? `#${cert.CardNumber}` : null,
      cert.PSAGrade ? `PSA ${cert.PSAGrade}` : null,
    ].filter(Boolean)

    const itemName = parts.join(' ') || `PSA Cert #${certNumber}`
    const imageUrl = `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNumber}/large/${certNumber}_f.jpg`

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
    })
  } catch (e: any) {
    return err('Failed to lookup PSA cert: ' + e.message)
  }
}