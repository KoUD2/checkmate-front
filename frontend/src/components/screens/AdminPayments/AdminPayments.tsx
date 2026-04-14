'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import styles from './AdminPayments.module.css'

interface AdminPayment {
  id: string
  yookassaId: string
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED'
  amount: number
  checksToAdd: number
  createdAt: string
  user: { id: string; email: string; firstName: string; lastName: string }
}

const LIMIT = 20

const STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: 'Оплачен',
  PENDING: 'Ожидает',
  CANCELED: 'Отменён',
}

const AdminPayments: FC = () => {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    api.get(`/admin/payments?page=${page}&limit=${LIMIT}`)
      .then(res => {
        const data = res.data?.data
        setPayments(data?.payments ?? [])
        setTotalPages(data?.totalPages ?? 1)
        setTotal(data?.total ?? 0)
      })
      .catch(() => {})
  }, [page])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const badgeClass = (status: string) => {
    if (status === 'SUCCEEDED') return `${styles.badge} ${styles.badgeSucceeded}`
    if (status === 'PENDING') return `${styles.badge} ${styles.badgePending}`
    return `${styles.badge} ${styles.badgeCanceled}`
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Платежи ({total})</h1>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Пользователь</th>
            <th>Email</th>
            <th>Сумма</th>
            <th>Проверок</th>
            <th>Статус</th>
            <th>Дата</th>
            <th>YooKassa ID</th>
          </tr>
        </thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id}>
              <td>{p.user.firstName} {p.user.lastName}</td>
              <td>{p.user.email}</td>
              <td><span className={styles.amount}>{Number(p.amount).toLocaleString('ru-RU')} ₽</span></td>
              <td>{p.checksToAdd}</td>
              <td><span className={badgeClass(p.status)}>{STATUS_LABELS[p.status] ?? p.status}</span></td>
              <td>{formatDate(p.createdAt)}</td>
              <td><span className={styles.yookassaId}>{p.yookassaId}</span></td>
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

export default AdminPayments
