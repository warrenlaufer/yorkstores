import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ok, err } from '@/lib/api'
import { createConnectAccount, createConnectOnboardingLink } from '@/lib/stripe'

// Creates (if needed) a Stripe Connect Express account for the current user and
// returns a hosted onboarding link. Works for both buyers and store owners —
// anyone who needs to receive payouts.
export async function POST() {
  const user = await getSession()
  if (!user) return err('Unauthorized', 401)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  try {
    let accountId = user.stripeAccountId

    if (!accountId) {
      const account = await createConnectAccount(user.email)
      accountId = account.id
      await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } })
    }

    const link = await createConnectOnboardingLink(accountId, appUrl)
    return ok({ url: link.url })
  } catch (e: any) {
    console.error('Connect onboarding error:', e?.message)
    // Most common cause: Connect isn't enabled on the platform's Stripe account.
    return err('Could not start payout setup. Please try again later.')
  }
}
