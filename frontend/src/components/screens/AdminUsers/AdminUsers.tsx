'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import styles from './AdminUsers.module.css'

interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADMIN' | 'USER'
  isActive: boolean
  freeChecksLeft: number
  createdAt: string
  subscription: { isActive: boolean; expiresAt: string | null } | null
  _count: { tasks: number }
}

const LIMIT = 20

const AdminUsers: FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [checksInputs, setChecksInputs] = useState<Record<string, string>>({})

  const fetchUsers = async (p: number) => {
    try {
      const res = await api.get(`/admin/users?page=${p}&limit=${LIMIT}`)
      const data = res.data?.data
      setUsers(data?.users ?? [])
      setTotalPages(data?.totalPages ?? 1)
    } catch {}
  }

  useEffect(() => { fetchUsers(page) }, [page])

  const patch = async (id: string, body: object) => {
    try {
      await api.patch(`/admin/users/${id}`, body)
      fetchUsers(page)
    } catch {}
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Пользователи</h1>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Имя</th>
            <th>Роль</th>
            <th>Статус</th>
            <th>Проверок</th>
            <th>Задания</th>
            <th>Дата рег.</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id}>
              <td>{u.email}</td>
              <td>{u.firstName} {u.lastName}</td>
              <td>
                <span className={u.role === 'ADMIN' ? `${styles.badge} ${styles.badgeAdmin}` : `${styles.badge} ${styles.badgeUser}`}>
                  {u.role}
                </span>
              </td>
              <td>
                {u.isActive
                  ? <span className={`${styles.badge} ${styles.badgeUser}`}>Активен</span>
                  : <span className={`${styles.badge} ${styles.badgeInactive}`}>Заблокирован</span>
                }
              </td>
              <td>{u.freeChecksLeft}</td>
              <td>{u._count.tasks}</td>
              <td>{formatDate(u.createdAt)}</td>
              <td>
                <div className={styles.actions}>
                  {u.role === 'USER'
                    ? <button className={styles.btn} onClick={() => patch(u.id, { role: 'ADMIN' })}>→ Admin</button>
                    : <button className={styles.btn} onClick={() => patch(u.id, { role: 'USER' })}>→ User</button>
                  }
                  {u.isActive
                    ? <button className={`${styles.btn} ${styles.btnDanger}`} onClick={() => patch(u.id, { isActive: false })}>Заблок.</button>
                    : <button className={styles.btn} onClick={() => patch(u.id, { isActive: true })}>Разблок.</button>
                  }
                  <input
                    className={styles.checksInput}
                    type='number'
                    min={0}
                    placeholder='0'
                    value={checksInputs[u.id] ?? ''}
                    onChange={e => setChecksInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                  />
                  <button
                    className={styles.btn}
                    onClick={() => {
                      const val = parseInt(checksInputs[u.id] ?? '')
                      if (!isNaN(val)) patch(u.id, { freeChecksLeft: val })
                    }}
                  >
                    Установить
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.pagination}>
        <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}>←</button>
        <span className={styles.pageInfo}>Стр. {page} / {totalPages}</span>
        <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>→</button>
      </div>
    </div>
  )
}

export default AdminUsers
