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
    if (data.IsValidRequest === false) return err(data.ServerMessage || 'Invalid cert number')

    // Build item name
    const parts = [
      data.Year,
      data.MintMark ? data.MintMark : null,
      data.Name ?? data.CoinName,
      data.Denomination,
      data.Grade ? `PCGS ${data.Grade}` : null,
    ].filter(Boolean)

    const itemName = parts.join(' ') || `PCGS Cert #${certNum}`

    // Price guide value
    const priceGuideValue = data.PriceGuideValue ?? null

    // Image — use Images array first, then fallbacks
    let imageUrl: string | null = null
    if (Array.isArray(data.Images) && data.Images.length > 0) {
      imageUrl = data.Images[0].Fullsize ?? data.Images[0].Thumbnail ?? null
    }
    if (!imageUrl) imageUrl = data.ObverseImage ?? data.ImageObverse ?? data.CoinImageUrl ?? null

    return ok({
      certNumber: certNum,
      itemName,
      grade: data.Grade,
      year: data.Year,
      mintMark: data.MintMark,
      coinName: data.Name ?? data.CoinName,
      denomination: data.Denomination,
      priceGuideValue,
      imageUrl,
    })
  } catch (e: any) {
    return err('Failed to lookup PCGS cert: ' + e.message)
  }
}