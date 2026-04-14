'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import styles from './AdminTasks.module.css'

interface AdminTask {
  id: string
  type: 'TASK37' | 'TASK38' | 'TASK39'
  totalScore: number | null
  createdAt: string
  user: { id: string; email: string; firstName: string; lastName: string }
}

const LIMIT = 20

const TASK_LABELS: Record<string, string> = {
  TASK37: 'Задание 37',
  TASK38: 'Задание 38',
  TASK39: 'Задание 39',
}

const AdminTasks: FC = () => {
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchTasks = async (p: number) => {
    try {
      const res = await api.get(`/admin/tasks?page=${p}&limit=${LIMIT}`)
      const data = res.data?.data
      setTasks(data?.tasks ?? [])
      setTotalPages(data?.totalPages ?? 1)
      setTotal(data?.total ?? 0)
    } catch {}
  }

  useEffect(() => { fetchTasks(page) }, [page])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Задания ({total})</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Тип</th>
            <th>Пользователь</th>
            <th>Email</th>
            <th>Оценка</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id}>
              <td><span className={styles.taskId}>{t.id.slice(0, 8)}…</span></td>
              <td><span className={styles.badge}>{TASK_LABELS[t.type] ?? t.type}</span></td>
              <td>{t.user.firstName} {t.user.lastName}</td>
              <td>{t.user.email}</td>
              <td><span className={styles.score}>{t.totalScore !== null ? t.totalScore : '—'}</span></td>
              <td>{formatDate(t.createdAt)}</td>
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

export default AdminTasks
