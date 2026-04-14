'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import styles from './AdminLayout.module.css'

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/users', label: 'Пользователи' },
  { href: '/admin/promos', label: 'Промокоды' },
  { href: '/admin/tasks', label: 'Задания' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

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
      <aside className={styles.sidebar}>
        <div className={styles.sidebarTitle}>Админ-панель</div>
        <nav className={styles.nav}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
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
          <Link href='/'>← На главную</Link>
        </div>
      </aside>
      <main className={styles.content}>{children}</main>
    </div>
  )
}
