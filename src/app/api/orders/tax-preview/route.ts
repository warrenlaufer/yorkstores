import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { calculateTax } from '@/lib/stripe'
import { toStripeTaxAddress } from '@/lib/tax'

// Returns a Stripe Tax estimate for taking delivery of a purchase, given an address.
// Used to show the buyer their tax before they confirm. The order route recalculates
// authoritatively at confirm time, so this is display-only.
export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const body = await req.json().catch(() => null)
  if (!body?.purchaseId) return err('Missing purchaseId')

  const purchase = await prisma.purchase.findUnique({
    where: { id: body.purchaseId },
    select: { buyerId: true, outcome: true, pricePaid: true },
  })
  if (!purchase || purchase.buyerId !== user.id) return err('Purchase not found', 404)
  if (purchase.outcome) return err('Already resolved')

  if (!body.addressLine1 || !body.city || !body.postcode) {
    return err('Enter your full address to calculate tax')
  }

  try {
    const calc = await calculateTax(
      Math.round(Number(purchase.pricePaid) * 100),
      toStripeTaxAddress({
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        state: body.state,
        postcode: body.postcode,
        country: body.country,
      })
    )
    const tax = (calc.tax_amount_exclusive ?? 0) / 100
    return ok({ tax: Math.round(tax * 100) / 100 })
  } catch (e: any) {
    console.error('Tax preview error:', e?.message)
    return err('Could not calculate tax — please check the address.')
  }
}
