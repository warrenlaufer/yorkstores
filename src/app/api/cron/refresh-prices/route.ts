import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ok } from '@/lib/api'
import { fetchUscCatalogMap } from '@/lib/usc'
import { sendCatalogFailureAlert } from '@/lib/email'

// Records each run in the CronRun table so we have a durable, first-party history of whether the
// job actually fires on schedule (and what it did) — independent of Vercel's logs/dashboard.
async function record(job: string, status: string, scanned: number, updated: number, startedAt: number, detail?: string) {
  try {
    await prisma.cronRun.create({
      data: { job, status, scanned, updated, durationMs: Date.now() - startedAt, detail: detail ?? null },
    })
  } catch (e) {
    console.error('CronRun log failed:', e)
  }
}

// Hourly: refresh the price of USC-priced bullion boxes that are still unsold in live drops.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startedAt = Date.now()
  const job = 'refresh-prices'

  let map
  try {
    map = await fetchUscCatalogMap()
  } catch (e: any) {
    console.error('USC price refresh: catalog fetch failed:', e?.message)
    await record(job, 'catalog_unavailable', 0, 0, startedAt, e?.message || 'unknown error')
    await sendCatalogFailureAlert('Hourly bullion price refresh (/api/cron/refresh-prices)', e?.message || 'unknown error')
    return new Response('catalog unavailable', { status: 502 })
  }

  try {
    const boxes = await prisma.box.findMany({
      where: { useUscApi: true, sold: false, removed: false, sku: { not: null }, drop: { isActive: true } },
      select: { id: true, sku: true, itemPrice: true },
    })

    let updated = 0
    for (const b of boxes) {
      const item = b.sku ? map.get(b.sku) : null
      if (!item || item.sellPrice <= 0) continue
      // PRICE ONLY. Do not touch itemName/itemImageUrl: rewriting the name to the catalog
      // description made boxes of one coin diverge and the prize display split a single item.
      if (Math.abs(Number(b.itemPrice) - item.sellPrice) >= 0.01) {
        await prisma.box.update({ where: { id: b.id }, data: { itemPrice: item.sellPrice } })
        updated++
      }
    }

    await record(job, 'ok', boxes.length, updated, startedAt, `catalog:${map.size}`)
    return ok({ scanned: boxes.length, updated, catalogSize: map.size })
  } catch (e: any) {
    console.error('USC price refresh failed:', e?.message)
    await record(job, 'error', 0, 0, startedAt, e?.message || 'unknown error')
    return new Response('refresh failed', { status: 500 })
  }
}
