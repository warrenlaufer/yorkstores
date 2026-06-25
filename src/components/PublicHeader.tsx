import Link from 'next/link'

export default function PublicHeader() {
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4.5rem', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.25rem', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontWeight: 800, fontSize: '1.1rem' }}>
        <span style={{ color: '#fff' }}>york</span><span style={{ color: '#FF6B85' }}>stores</span>
      </Link>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/signin" style={{ color: 'var(--text)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 700, padding: '0.45rem 0.9rem', borderRadius: 8 }}>Log in</Link>
        <Link href="/signup" style={{ background: '#FF6B85', color: '#fff', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 800, padding: '0.45rem 1rem', borderRadius: 8 }}>Sign up</Link>
      </div>
    </header>
  )
}
