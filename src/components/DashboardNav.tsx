'use client'
import { usePathname, useRouter } from 'next/navigation'
import styles from './DashboardNav.module.css'

type User = {
  id: string
  name: string
  email: string
  role: string
  company?: string
  walletBalance: number
  storeBalance: number
}

export default function DashboardNav({ user }: { user: User }) {
  const pathname = usePathname()
  const router = useRouter()
  const isStore = user.role === 'STORE_OWNER' || user.role === 'ADMIN'
  const isAdmin = user.role === 'ADMIN'

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/signin')
    router.refresh()
  }

  const tabs = [
    { href: '/dashboard', label: 'Drops' },
    { href: '/dashboard/history', label: 'History' },
    ...(isStore ? [
      { href: '/dashboard/store', label: 'Store Owner' },
      { href: '/dashboard/fulfilment', label: 'Fulfilment' },
    ] : []),
    ...(isAdmin ? [{ href: '/dashboard/admin', label: 'Admin' }] : []),
  ]

  return (
    <nav className={styles.nav}>
      <div className={styles.logo}>
        <svg className={styles.dog} viewBox="0 0 40 44" fill="#FF6B85" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <ellipse cx="20" cy="30" rx="13" ry="9"/>
          <ellipse cx="30" cy="16" rx="8" ry="7"/>
          <ellipse cx="37" cy="19" rx="4" ry="3"/>
          <ellipse cx="24" cy="10" rx="4" ry="5" transform="rotate(-15 24 10)"/>
          <ellipse cx="33" cy="9" rx="3.5" ry="5" transform="rotate(15 33 9)"/>
          <path d="M7 26 Q2 18 6 14 Q9 11 11 15 Q9 18 11 23"/>
          <rect x="26" y="36" width="4" height="8" rx="2"/>
          <rect x="20" y="36" width="4" height="8" rx="2"/>
          <rect x="13" y="36" width="4" height="8" rx="2"/>
          <rect x="7" y="35" width="4" height="8" rx="2"/>
          <circle cx="35" cy="15" r="1.2" fill="#0F0F14"/>
          <ellipse cx="40" cy="20" rx="1.5" ry="1" fill="#0F0F14"/>
        </svg>York<em className={styles.em}>stores</em>
      </div>

      <div className={styles.tabs}>
        {tabs.map(t => (
          <a key={t.href} href={t.href} className={`${styles.tab} ${pathname === t.href ? styles.tabActive : ''}`}>
            {t.label}
          </a>
        ))}
      </div>

      <div className={styles.right}>
        <button className={styles.walletChip} onClick={() => router.push('/dashboard/wallet')}>
          <span className={styles.chipLabel}>Wallet</span>
          <span className={styles.chipValue}>${user.walletBalance.toFixed(2)}</span>
          <span className={styles.chipPlus}>+</span>
        </button>
        {isStore && (
          <button className={`${styles.walletChip} ${styles.storeChip}`} onClick={() => router.push('/dashboard/wallet')}>
            <span className={styles.chipLabel}>Store</span>
            <span className={styles.chipValue}>${user.storeBalance.toFixed(2)}</span>
          </button>
        )}
        <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
      </div>
    </nav>
  )
}
