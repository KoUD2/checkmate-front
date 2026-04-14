'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import AdminCharts from './AdminCharts'
import styles from './AdminDashboard.module.css'

interface Stats {
  totalUsers: number
  totalTasks: number
  totalPayments: number
  totalRevenue: number
}

const AdminDashboard: FC = () => {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(res.data?.data ?? null)).catch(() => {})
  }, [])

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.cards}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Пользователей</div>
          <div className={styles.cardValue}>{stats ? stats.totalUsers : '—'}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Заданий проверено</div>
          <div className={styles.cardValue}>{stats ? stats.totalTasks : '—'}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Успешных платежей</div>
          <div className={styles.cardValue}>{stats ? stats.totalPayments : '—'}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Выручка</div>
          <div className={styles.cardValue}>
            {stats ? `${Number(stats.totalRevenue).toLocaleString('ru-RU')} ₽` : '—'}
          </div>
        </div>
      </div>
      <AdminCharts />
    </div>
  )
}

export default AdminDashboard
