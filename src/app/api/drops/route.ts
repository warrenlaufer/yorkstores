import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { calcBoxPriceForDrop } from '@/lib/stripe'
import { Role } from '@prisma/client'
import { createDropSchema, draftDropSchema } from '@/lib/schemas'
import { fetchUscCatalogMap } from '@/lib/usc'
import { sendCatalogFailureAlert } from '@/lib/email'
import { isValidCategory, normalizeSubcategory } from '@/lib/categories'

export async function GET() {
  const drops = await prisma.drop.findMany({
    where: { isActive: true },
    include: {
      owner: { select: { name: true, company: true } },
      boxes: { where: { removed: false }, select: { id: true, itemPrice: true, sold: true, itemName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return ok(drops.map(d => {
    const allPrices = d.boxes.map(b => Number(b.itemPrice))
    const unsoldPrices = d.boxes.filter(b => !b.sold).map(b => Number(b.itemPrice))
    const available = d.boxes.filter(b => !b.sold).length
    return {
      id: d.id,
      name: d.name,
      emoji: d.emoji,
      logoUrl: d.logoUrl,
      sellBackPct: d.sellBackPct,
      pricingType: d.pricingType,
      category: d.category,
      subcategory: d.subcategory,
      owner: d.owner.company ?? d.owner.name,
      boxPrice: calcBoxPriceForDrop(allPrices, unsoldPrices, d.pricingType),
      totalBoxes: d.boxes.length,
      availableBoxes: available,
      minPrice: allPrices.length ? Math.min(...allPrices) : 0,
      maxPrice: allPrices.length ? Math.max(...allPrices) : 0,
    }
  }))
}

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  if (user.role !== Role.STORE_OWNER && user.role !== Role.ADMIN) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  const isDraft = body?.draft === true

  const parsed = isDraft ? draftDropSchema.safeParse(body) : createDropSchema.safeParse(body)
  if (!parsed.success) return err(parsed.error.errors[0].message)

  const name = (parsed.data.name && parsed.data.name.trim()) ? parsed.data.name.trim() : (isDraft ? 'Untitled draft' : '')
  const emoji = parsed.data.emoji
  const boxDefs = parsed.data.boxes ?? []
  if (!isDraft && !name) return err('Give your drop a name.')
  const logoUrl = body?.logoUrl ?? null
  const sellBackPct = typeof body?.sellBackPct === 'number'
    ? Math.min(100, Math.max(1, Math.round(body.sellBackPct)))
    : 90
  const pricingType = body?.pricingType === 'dynamic' ? 'dynamic' : 'fixed'
  const category = isValidCategory(body?.category) ? body.category : 'Other Collectibles'
  const subcategory = normalizeSubcategory(category, body?.subcategory)

  // If any box opts into USC API pricing, fetch the catalog once and snapshot prices.
  let uscMap: Awaited<ReturnType<typeof fetchUscCatalogMap>> | null = null
  if (boxDefs.some(b => b.useUscApi)) {
    try {
      uscMap = await fetchUscCatalogMap()
    } catch (e: any) {
      await sendCatalogFailureAlert('Drop creation price snapshot (/api/drops)', e?.message || 'unknown error')
      return err('Could not reach the US Coins catalog to price bullion items. Please try again shortly.')
    }
    for (const b of boxDefs) {
      if (b.useUscApi) {
        if (!b.sku) return err('Select a catalog item for each box set to use USC API pricing.')
        if (!uscMap.get(b.sku)) return err(`US Coins catalog has no SKU "${b.sku}".`)
      }
    }
  }

  const boxRecords = boxDefs.flatMap(b => {
    const usc = b.useUscApi && b.sku ? uscMap?.get(b.sku) : null
    const price = usc ? usc.sellPrice : b.itemPrice
    return Array.from({ length: b.qty }, () => ({
      itemName: b.itemName,
      itemPrice: price,
      itemShippingCost: b.itemShippingCost,
      itemImageUrl: b.itemImageUrl || null,
      useUscApi: !!usc,
      sku: usc ? b.sku : null,
    }))
  })

  for (let i = boxRecords.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[boxRecords[i], boxRecords[j]] = [boxRecords[j], boxRecords[i]]
  }

  const drop = await prisma.drop.create({
    data: {
      name, emoji, logoUrl, sellBackPct, pricingType, category, subcategory,
      ownerId: user.id,
      isActive: !isDraft,
      isDraft,
      boxes: { createMany: { data: boxRecords } },
    },
    include: {
      boxes: true,
      owner: { select: { name: true, company: true } },
    },
  })

  return ok(drop, 201)
}