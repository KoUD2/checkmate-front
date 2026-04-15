'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import styles from './PaymentsPage.module.css'

interface MyPayment {
  id: string
  yookassaId: string
  status: 'PENDING' | 'SUCCEEDED' | 'CANCELED'
  amount: number
  checksToAdd: number
  daysToAdd: number
  createdAt: string
}

const LIMIT = 20

const STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: 'Оплачен',
  PENDING: 'Ожидает',
  CANCELED: 'Отменён',
}

const PaymentsPage: FC = () => {
  const [payments, setPayments] = useState<MyPayment[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get(`/payments/my?page=${page}&limit=${LIMIT}`)
      .then((res) => {
        const data = res.data?.data
        setPayments(data?.payments ?? [])
        setTotalPages(data?.totalPages ?? 1)
        setTotal(data?.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [page])

  const formatDateOnly = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`

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
      <div className={styles.container}>
        <h1 className={styles.title}>История платежей</h1>

        {loading ? (
          <div className={styles.placeholder}>Загрузка...</div>
        ) : total === 0 ? (
          <div className={styles.placeholder}>Платежей пока нет</div>
        ) : (
          <>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Дата</th>
                    <th>Проверок</th>
                    <th>Сумма</th>
                    <th>Действует до</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.createdAt)}</td>
                      <td>{p.checksToAdd}</td>
                      <td>
                        <span className={styles.amount}>
                          {Number(p.amount).toLocaleString('ru-RU')} ₽
                        </span>
                      </td>
                      <td>
                        {p.daysToAdd > 0 && p.status === 'SUCCEEDED'
                          ? formatDateOnly(new Date(new Date(p.createdAt).getTime() + p.daysToAdd * 86400000))
                          : <span className={styles.noExpiry}>—</span>}
                      </td>
                      <td>
                        <span className={badgeClass(p.status)}>
                          {STATUS_LABELS[p.status] ?? p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                >
                  ←
                </button>
                <span className={styles.pageInfo}>
                  {page} / {totalPages}
                </span>
                <button
                  className={styles.pageBtn}
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default PaymentsPage
