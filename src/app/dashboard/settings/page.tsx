import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import ChangePasswordForm from '@/components/ChangePasswordForm'

const card: React.CSSProperties = { background: '#16161E', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, padding: '1.5rem', marginBottom: '1.25rem' }
const rowLabel: React.CSSProperties = { fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text3)' }

export default async function SettingsPage() {
  const user = await getSession()
  if (!user) redirect('/signin')

  const roleLabel = user.role === 'STORE_OWNER' ? 'Store owner' : user.role === 'ADMIN' ? 'Admin' : 'Buyer'

  return (
    <div style={{ maxWidth: 540, margin: '0 auto', padding: '2.5rem 1.25rem 5rem' }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 1.5rem' }}>Account settings</h1>

      <div style={card}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: '0 0 1rem' }}>Account</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div><div style={rowLabel}>Name</div><div style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{user.name}</div></div>
          <div><div style={rowLabel}>Email</div><div style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{user.email}</div></div>
          {user.company && <div><div style={rowLabel}>Company</div><div style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{user.company}</div></div>}
          <div><div style={rowLabel}>Account type</div><div style={{ color: 'var(--text)', fontSize: '0.9rem' }}>{roleLabel}</div></div>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#fff', margin: '0 0 0.4rem' }}>Change password</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text2)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          Enter your current password and choose a new one (at least 8 characters).
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
