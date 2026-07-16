import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'
import { fetchUscCatalogMap } from '@/lib/usc'

// Admin-only diagnostic for bullion (USC) pricing. Visit while logged in as an admin:
//   /api/admin/pricing-diagnostic
// It reports whether the catalog loads, whether box SKUs match the catalog, and where each
// USC box's stored price sits versus the live catalog price — so we can see exactly why prices
// aren't refreshing, without guessing.
export async function GET() {
  const user = await getSession()
  if (!user || user.role !== Role.ADMIN) return err('Forbidden', 403)

  // 1) Can we load the catalog at all?
  let map
  try {
    map = await fetchUscCatalogMap()
  } catch (e: any) {
    return ok({
      ok: false,
      stage: 'catalog_fetch',
      message: 'The US Coins catalog could not be loaded. Check that USCOINS_CATALOG_URL is set in Vercel and reachable.',
      error: e?.message ?? 'unknown error',
    })
  }

  // 2) Look at every USC box (mirrors the cron filter, but WITHOUT drop.isActive so we can also
  //    see boxes in paused drops), plus a broader look at boxes in bullion-category drops.
  const uscBoxes = await prisma.box.findMany({
    where: { useUscApi: true, sku: { not: null } },
    select: {
      id: true, sku: true, itemName: true, itemPrice: true, sold: true, removed: true,
      drop: { select: { id: true, name: true, isActive: true, category: true } },
    },
  })

  // Boxes that live in bullion drops but AREN'T flagged for USC pricing (common silent failure:
  // the box was created without useUscApi/sku, so the cron never touches it).
  const unflaggedInBullionDrops = await prisma.box.count({
    where: { drop: { category: 'Bullion' }, OR: [{ useUscApi: false }, { sku: null }] },
  })

  const rows = uscBoxes.map(b => {
    const item = b.sku ? map!.get(b.sku) : null
    const stored = Number(b.itemPrice)
    return {
      dropName: b.drop.name,
      dropActive: b.drop.isActive,
      sold: b.sold,
      removed: b.removed,
      sku: b.sku,
      itemName: b.itemName,
      storedPrice: stored,
      catalogFound: !!item,
      catalogName: item?.description ?? null,
      catalogPrice: item?.sellPrice ?? null,
      wouldUpdate: !!item && item.sellPrice > 0 && Math.abs(stored - item.sellPrice) >= 0.01,
      // Why the cron would skip this box, if it would:
      skipReason: !item ? 'sku_not_in_catalog'
        : item.sellPrice <= 0 ? 'catalog_price_zero'
        : b.sold ? 'box_sold'
        : b.removed ? 'box_removed'
        : !b.drop.isActive ? 'drop_paused'
        : null,
    }
  })

  const eligible = rows.filter(r => !r.sold && !r.removed && r.dropActive)

  return ok({
    ok: true,
    catalogSize: map.size,
    totals: {
      uscBoxes: rows.length,
      eligibleForCron: eligible.length,              // what the hourly cron actually scans
      wouldUpdateNow: eligible.filter(r => r.wouldUpdate).length,
      skuNotInCatalog: rows.filter(r => !r.catalogFound).length,
      catalogPriceZero: rows.filter(r => r.catalogFound && (r.catalogPrice ?? 0) <= 0).length,
      unflaggedBoxesInBullionDrops: unflaggedInBullionDrops,
    },
    // A few concrete examples of each problem so we can see real SKUs/prices:
    samples: {
      skuNotInCatalog: rows.filter(r => !r.catalogFound).slice(0, 8).map(r => ({ sku: r.sku, itemName: r.itemName, dropName: r.dropName })),
      priceMismatch: eligible.filter(r => r.wouldUpdate).slice(0, 8).map(r => ({ sku: r.sku, itemName: r.itemName, storedPrice: r.storedPrice, catalogPrice: r.catalogPrice })),
      firstFewEligible: eligible.slice(0, 8).map(r => ({ sku: r.sku, itemName: r.itemName, storedPrice: r.storedPrice, catalogPrice: r.catalogPrice, wouldUpdate: r.wouldUpdate })),
    },
  })
}
