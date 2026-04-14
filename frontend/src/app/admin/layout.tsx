'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/payments', label: 'Платежи' },
  { href: '/admin/promos', label: 'Промокоды' },
  { href: '/admin/tasks', label: 'Задания' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN') {
      router.push('/')
    }
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading || !user || user.role !== 'ADMIN') {
    return null
  }

  return (
    <div className={styles.layout}>
      {sidebarOpen && (
        <div
          className={styles.overlayVisible}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`${styles.sidebar}${sidebarOpen ? ` ${styles.sidebarOpen}` : ''}`}>
        <div className={styles.sidebarTitle}>Админ-панель</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={
                pathname === item.href
                  ? `${styles.navLink} ${styles.navLinkActive}`
                  : styles.navLink
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.backLink}>
          <Link href='/' onClick={() => setSidebarOpen(false)}>← На главную</Link>
        </div>
      </aside>
      <div className={styles.contentWrapper}>
        <div className={styles.mobileBar}>
          <button
            className={styles.menuToggle}
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Открыть меню"
          >
            ☰
          </button>
        </div>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  )
}
