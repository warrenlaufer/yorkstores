import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getConnectAccount } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export default async function ConnectReturnPage() {
  const user = await getSession()
  if (!user) redirect('/signin')

  let payoutsEnabled = false
  if (user.stripeAccountId) {
    try {
      const acct = await getConnectAccount(user.stripeAccountId)
      payoutsEnabled = !!(acct as any).payouts_enabled
      await prisma.user.update({ where: { id: user.id }, data: { payoutsEnabled } })
    } catch (e) {
      console.error('Connect return status check failed:', e)
    }
  }

  const home = user.role === 'BUYER' ? '/dashboard/wallet' : '/dashboard/store'

  return (
    <div style={{ maxWidth: 480, margin: '4rem auto', textAlign: 'center', padding: '0 1rem' }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{payoutsEnabled ? '✅' : '⏳'}</div>
      <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
        {payoutsEnabled ? 'Payouts are ready' : 'Payout setup in review'}
      </h1>
      <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        {payoutsEnabled
          ? 'Your account is set up to receive payouts. You can now withdraw your balance.'
          : 'Stripe is still verifying your details. This can take a little while — check back shortly. You can return to your dashboard in the meantime.'}
      </p>
      <Link href={home} style={{ display: 'inline-block', background: '#FF6B85', color: '#fff', textDecoration: 'none', borderRadius: 8, fontWeight: 800, fontSize: '0.85rem', padding: '0.6rem 1.4rem' }}>
        Back to dashboard
      </Link>
    </div>
  )
}
