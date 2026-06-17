import { getSession } from '@/lib/auth'
import { ok, err } from '@/lib/api'
import { AGREEMENTS_VERSION } from '@/lib/legal'

export async function GET() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)
  return ok({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    company: user.company,
    walletBalance: Number(user.walletBalance),
    cashBalance: Number(user.cashBalance),
    promoBalance: Number(user.promoBalance),
    storeBalance: Number(user.storeBalance),
    payoutsEnabled: user.payoutsEnabled,
    hasStripeAccount: !!user.stripeAccountId,
    needsAgreement: user.agreementVersion !== AGREEMENTS_VERSION,
    needsSellerAgreement: user.role === 'STORE_OWNER' && user.sellerAgreementVersion !== AGREEMENTS_VERSION,
  })
}
