import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DashboardNav from '@/components/DashboardNav'
import ContactModal from '@/components/ContactModal'
import AgreementGate from '@/components/AgreementGate'
import { AGREEMENTS_VERSION } from '@/lib/legal'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/signin')

  const needsGeneral = user.agreementVersion !== AGREEMENTS_VERSION
  const needsSeller = user.role === 'STORE_OWNER' && user.sellerAgreementVersion !== AGREEMENTS_VERSION

  return (
    <div>
      <DashboardNav user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company ?? undefined,
        walletBalance: Number(user.walletBalance),
        storeBalance: Number(user.storeBalance),
      }} />
      <main style={{ paddingTop: '4.5rem' }}>
        {children}
      </main>
      <ContactModal />
      {(needsGeneral || needsSeller) && <AgreementGate needsSeller={needsSeller} />}
    </div>
  )
}