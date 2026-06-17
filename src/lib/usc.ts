// Helper for the US Coins (x42portal) catalog API used to price bullion items.
// The full endpoint (including its key) is stored server-side in USCOINS_CATALOG_URL.

export type UscItem = {
  sku: string
  description: string
  family: string
  majorCategory: string
  minorCategory: string
  sellPrice: number
  availability: string
  onHand: number
  imageUrl: string | null
}

function parsePrice(s: unknown): number {
  if (typeof s === 'number') return s
  const n = Number(String(s ?? '').replace(/,/g, '').trim())
  return Number.isFinite(n) ? n : 0
}

// Fetch and normalize the catalog. Throws if the endpoint isn't configured or fails.
export async function fetchUscCatalog(): Promise<UscItem[]> {
  const url = process.env.USCOINS_CATALOG_URL
  if (!url) throw new Error('USCOINS_CATALOG_URL is not configured')

  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`US Coins catalog responded ${res.status}`)

  const data = await res.json()
  if (data?.status !== 'ok' || !Array.isArray(data.result)) {
    throw new Error('Unexpected catalog response')
  }

  return data.result.map((r: any): UscItem => ({
    sku: String(r.sku ?? ''),
    description: String(r.description ?? ''),
    family: String(r.family ?? ''),
    majorCategory: String(r.majorCategory ?? ''),
    minorCategory: String(r.minorCategory ?? ''),
    sellPrice: parsePrice(r.sellPrice),
    availability: String(r.availability ?? ''),
    onHand: Number(r.onHand ?? 0),
    imageUrl: r.image1Url ? String(r.image1Url) : null,
  })).filter((i: UscItem) => i.sku)
}

// Convenience: a sku -> item map for quick lookups (snapshot at creation, hourly refresh).
export async function fetchUscCatalogMap(): Promise<Map<string, UscItem>> {
  const items = await fetchUscCatalog()
  return new Map(items.map(i => [i.sku, i]))
}
