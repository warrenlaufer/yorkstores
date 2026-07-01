import Link from 'next/link'

export default function PublicHeader() {
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4.5rem', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--sp-5)', background: 'rgba(8,8,11,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid var(--border)' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: '1.1rem' }}>
        <span style={{ color: 'var(--text)' }}>york</span><span style={{ color: 'var(--accent)' }}>stores</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <Link href="/signin" className="btn btn-ghost btn-sm">Log in</Link>
        <Link href="/signup" className="btn btn-primary btn-sm">Sign up</Link>
      </div>
    </header>
  )
}
