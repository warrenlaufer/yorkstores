import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { Role } from '@prisma/client'
import { fetchUscCatalog } from '@/lib/usc'

// Returns the US Coins bullion catalog for the drop-creation picker.
// Seller/admin only; the API key stays on the server.
export async function GET() {
  const user = await getSession()
  if (!user || (user.role !== Role.STORE && user.role !== Role.ADMIN)) return err('Forbidden', 403)

  try {
    const items = await fetchUscCatalog()
    const bullion = items.filter(i => i.family.toUpperCase() === 'BULLION')
    return ok(bullion.map(i => ({
      sku: i.sku,
      description: i.description,
      majorCategory: i.majorCategory,
      sellPrice: i.sellPrice,
      availability: i.availability,
      onHand: i.onHand,
      imageUrl: i.imageUrl,
    })))
  } catch (e: any) {
    console.error('Bullion catalog fetch error:', e?.message)
    return err('Could not load the US Coins catalog right now.')
  }
}
