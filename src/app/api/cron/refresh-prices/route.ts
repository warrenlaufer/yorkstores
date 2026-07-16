import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'
import { fetchUscCatalogMap } from '@/lib/usc'
import { sendCatalogFailureAlert } from '@/lib/email'

// Hourly: refresh the price of USC-priced bullion boxes that are still unsold in live drops.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  let map
  try {
    map = await fetchUscCatalogMap()
  } catch (e: any) {
    console.error('USC price refresh: catalog fetch failed:', e?.message)
    await sendCatalogFailureAlert('Hourly bullion price refresh (/api/cron/refresh-prices)', e?.message || 'unknown error')
    return new Response('catalog unavailable', { status: 502 })
  }

  const boxes = await prisma.box.findMany({
    where: { useUscApi: true, sold: false, removed: false, sku: { not: null }, drop: { isActive: true } },
    select: { id: true, sku: true, itemPrice: true },
  })

  let updated = 0
  for (const b of boxes) {
    const item = b.sku ? map.get(b.sku) : null
    if (!item || item.sellPrice <= 0) continue
    if (Math.abs(Number(b.itemPrice) - item.sellPrice) >= 0.01) {
      await prisma.box.update({ where: { id: b.id }, data: { itemPrice: item.sellPrice } })
      updated++
    }
  }

  return ok({ scanned: boxes.length, updated })
}
