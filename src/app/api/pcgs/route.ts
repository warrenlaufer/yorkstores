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

  const token = process.env.PCGS_API_TOKEN
  if (!token) return err('PCGS API not configured')

  const certNum = certNumber.trim()
  const headers = {
    'Authorization': `bearer ${token}`,
    'Content-Type': 'application/json',
  }

  try {
    const res = await fetch(`https://api.pcgs.com/publicapi/coindetail/GetCoinFactsByCertNo/${certNum}`, { headers })

    if (res.status === 204) return err('No coin found for this cert number')
    if (!res.ok) return err(`PCGS error: ${res.status}`)

    const text = await res.text()
    let data: any
    try { data = JSON.parse(text) } catch { return err('PCGS returned unexpected response') }

    if (!data) return err('No coin data found')

    // Build item name
    const parts = [
      data.Year,
      data.MintMark ? `${data.MintMark}` : null,
      data.CoinName ?? data.Name,
      data.Denomination,
      data.Grade ? `PCGS ${data.Grade}` : null,
    ].filter(Boolean)

    const itemName = parts.join(' ') || `PCGS Cert #${certNum}`

    // Price guide value
    const priceGuideValue = data.PriceGuideValue ?? data.Price ?? null

    // Image — PCGS CoinFacts returns ObverseImage and ReverseImage
    const imageUrl = data.ObverseImage ?? data.ImageObverse ?? data.CoinImageUrl ?? null

    return ok({
      certNumber: certNum,
      itemName,
      grade: data.Grade,
      year: data.Year,
      mintMark: data.MintMark,
      coinName: data.CoinName ?? data.Name,
      denomination: data.Denomination,
      priceGuideValue,
      imageUrl,
      rawData: data,
    })
  } catch (e: any) {
    return err('Failed to lookup PCGS cert: ' + e.message)
  }
}