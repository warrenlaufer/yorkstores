import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ChangePasswordForm from '@/components/ChangePasswordForm'

const rowLabel: React.CSSProperties = { fontSize: 'var(--fs-xs)', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text3)' }
const rowVal: React.CSSProperties = { color: 'var(--text)', fontSize: 'var(--fs-base)' }

export default async function SettingsPage() {
  const user = await getSession()
  if (!user) redirect('/signin')

  const roleLabel = user.role === 'STORE_OWNER' ? 'Store owner' : user.role === 'ADMIN' ? 'Admin' : 'Buyer'

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '2.5rem var(--sp-5) 5rem' }}>
      <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 800, color: 'var(--text)', margin: '0 0 var(--sp-5)' }}>Account settings</h1>

      <div className="surface-card" style={{ padding: 'var(--sp-5)', marginBottom: 'var(--sp-4)' }}>
        <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 800, color: 'var(--text)', margin: '0 0 var(--sp-4)' }}>Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div><div style={rowLabel}>Name</div><div style={rowVal}>{user.name}</div></div>
          <div><div style={rowLabel}>Email</div><div style={rowVal}>{user.email}</div></div>
          {user.company && <div><div style={rowLabel}>Company</div><div style={rowVal}>{user.company}</div></div>}
          <div><div style={rowLabel}>Account type</div><div style={rowVal}>{roleLabel}</div></div>
        </div>
      </div>

      <div className="surface-card" style={{ padding: 'var(--sp-5)' }}>
        <h2 style={{ fontSize: 'var(--fs-md)', fontWeight: 800, color: 'var(--text)', margin: '0 0 var(--sp-2)' }}>Change password</h2>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text2)', margin: '0 0 var(--sp-5)', lineHeight: 1.5 }}>
          Enter your current password and choose a new one (at least 8 characters).
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
