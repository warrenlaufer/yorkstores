import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import DashboardNav from '@/components/DashboardNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  if (!user) redirect('/signin')

  return (
    <div style={{ minHeight: '100vh' }}>
      <DashboardNav user={{ id: user.id, name: user.name, email: user.email, role: user.role, company: user.company ?? undefined, walletBalance: Number(user.walletBalance), storeBalance: Number(user.storeBalance) }} />
      <main>{children}</main>
    </div>
  )
}
