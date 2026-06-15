import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
})

export function calcBoxPrice(itemPrices: number[], pricingType: string = 'fixed') {
  if (!itemPrices.length) return 0
  const avg = itemPrices.reduce((a, b) => a + b, 0) / itemPrices.length
  return Math.round(avg * 1.05)
}

// For dynamic pricing, pass only unsold box prices
// For fixed pricing, pass all box prices
export function calcBoxPriceForDrop(allPrices: number[], unsoldPrices: number[], pricingType: string) {
  const prices = pricingType === 'dynamic' ? unsoldPrices : allPrices
  if (!prices.length) return 0
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length
  return Math.round(avg * 1.05)
}

export async function createConnectAccount(email: string) {
  return stripe.accounts.create({
    type: 'express',
    email,
    capabilities: { transfers: { requested: true } },
  })
}

export async function createConnectOnboardingLink(accountId: string, appUrl: string) {
  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/dashboard/payments/connect/refresh`,
    return_url: `${appUrl}/dashboard/payments/connect/return`,
    type: 'account_onboarding',
  })
}

export async function getConnectAccount(accountId: string) {
  return stripe.accounts.retrieve(accountId)
}

// Move funds from the platform balance to a connected account (a payout to a buyer or store).
// idempotencyKey prevents a double-transfer if the call is retried.
export async function createTransfer(destinationAccountId: string, amountDollars: number, idempotencyKey: string, description?: string) {
  return stripe.transfers.create(
    {
      amount: Math.round(amountDollars * 100),
      currency: 'usd',
      destination: destinationAccountId,
      description,
    },
    { idempotencyKey }
  )
}