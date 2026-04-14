'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import styles from './AdminCharts.module.css'

interface DayPoint { day: string; value: number }
interface TypePoint { type: string; count: number }
interface PackagePoint { name: string; count: number }

interface ChartsData {
  revenueByDay: DayPoint[]
  usersByDay: DayPoint[]
  tasksByType: TypePoint[]
  salesByPackage: PackagePoint[]
}

const fmt = (day: string) => day.slice(5) // MM-DD

const AdminCharts: FC = () => {
  const [data, setData] = useState<ChartsData | null>(null)

  useEffect(() => {
    api.get('/admin/charts').then(res => setData(res.data?.data ?? null)).catch(() => {})
  }, [])

  if (!data) return <div className={styles.loading}>Загрузка графиков...</div>

  return (
    <div className={styles.grid}>
      <div className={styles.chart}>
        <div className={styles.chartTitle}>Выручка по дням, ₽</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tickFormatter={fmt} tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} width={55} />
            <Tooltip formatter={(v) => [`${Number(v).toLocaleString('ru-RU')} ₽`, 'Выручка']} labelFormatter={fmt} />
            <Line type="monotone" dataKey="value" stroke="#c9622f" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chart}>
        <div className={styles.chartTitle}>Новые пользователи по дням</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.usersByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="day" tickFormatter={fmt} tick={{ fontSize: 11 }} interval={4} />
            <YAxis tick={{ fontSize: 11 }} width={35} allowDecimals={false} />
            <Tooltip formatter={(v) => [Number(v), 'Регистраций']} labelFormatter={fmt} />
            <Bar dataKey="value" fill="#c9622f" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chart}>
        <div className={styles.chartTitle}>Продажи по пакетам</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.salesByPackage} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={45} />
            <Tooltip formatter={(v) => [Number(v), 'Продаж']} />
            <Bar dataKey="count" fill="#c9622f" radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.chart}>
        <div className={styles.chartTitle}>Задания по типам (30 дней)</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.tasksByType}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="type" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={35} allowDecimals={false} />
            <Tooltip formatter={(v) => [Number(v), 'Заданий']} />
            <Bar dataKey="count" fill="#c9622f" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default AdminCharts
