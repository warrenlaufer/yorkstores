import { prisma } from '@/lib/prisma'

// Re-randomizes which item sits in which unsold box for a drop (Fisher-Yates). Must be AWAITED by
// callers — in serverless, un-awaited work after the response is often killed before it runs, which
// leaves the pool static and makes a box's contents predictable. Call this after every purchase and
// after every sell-back (which returns a box to the pool), so a box that keeps getting played does
// not keep yielding the same item.
export async function shuffleUnsoldBoxes(dropId: string) {
  try {
    const unsoldBoxes = await prisma.box.findMany({
      where: { dropId, sold: false, removed: false },
      select: { id: true, itemName: true, itemPrice: true, itemShippingCost: true, itemImageUrl: true, sku: true, useUscApi: true },
    })
    if (unsoldBoxes.length <= 1) return

    // The FULL item identity travels together — crucially including the pricing identity
    // (sku, useUscApi). USC bullion boxes ARE shuffled (buyers can pick a box, so the coin↔box
    // mapping must stay randomized), but because the SKU moves with the coin, each box's SKU still
    // matches its displayed coin and the hourly cron re-prices it correctly.
    const identities = unsoldBoxes.map(b => ({
      itemName: b.itemName,
      itemPrice: b.itemPrice,
      itemShippingCost: b.itemShippingCost,
      itemImageUrl: b.itemImageUrl ?? null,
      sku: b.sku ?? null,
      useUscApi: b.useUscApi,
    }))

    for (let i = identities.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[identities[i], identities[j]] = [identities[j], identities[i]]
    }

    const esc = (s: string) => s.replace(/'/g, "''")
    const values = unsoldBoxes.map((b, idx) => {
      const it = identities[idx]
      return `('${b.id}', '${esc(it.itemName)}', ${Number(it.itemPrice)}, ${Number(it.itemShippingCost)}, ${it.itemImageUrl ? `'${esc(it.itemImageUrl)}'` : 'NULL'}, ${it.sku ? `'${esc(it.sku)}'` : 'NULL'}, ${it.useUscApi ? 'true' : 'false'})`
    }).join(',')

    await prisma.$executeRawUnsafe(`
      UPDATE "Box" AS b SET
        "itemName" = v."itemName"::text,
        "itemPrice" = v."itemPrice"::numeric,
        "itemShippingCost" = v."itemShippingCost"::numeric,
        "itemImageUrl" = v."itemImageUrl"::text,
        "sku" = v."sku"::text,
        "useUscApi" = v."useUscApi"::boolean
      FROM (VALUES ${values}) AS v(id, "itemName", "itemPrice", "itemShippingCost", "itemImageUrl", "sku", "useUscApi")
      WHERE b.id = v.id
    `)
  } catch (e) {
    console.error('Shuffle failed:', e)
  }
}
