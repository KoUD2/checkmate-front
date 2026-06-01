'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import {
  CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import styles from './AdminMetrics.module.css'

interface PacWeek { week: string; pac: number; new: number; retained: number; reactivated: number }
interface Metrics {
  range: { from: string; to: string; weeks: string[] }
  nsm: { pacByWeek: PacWeek[]; current: number; wowGrowthPct: number | null }
  newPac: {
    registrationsByWeek: { week: string; count: number }[]
    byChannel: Record<string, number>
    activationRate: number
    freeToPaidCR: number
    tariffMix: Record<string, number>
  }
  retained: {
    subscriptionRetentionByWeek: { week: string; rate: number | null }[]
    arpcByWeek: { week: string; arpc: number }[]
    quality: { dislikeRate: number | null; avgScore: number | null }
  }
  backup: {
    revenue: number; mrrEquivalent: number
    dauByDay: { day: string; count: number }[]
    wauByWeek: { week: string; count: number }[]
  }
  guardrails: { duplicateTextRate: number; medianTextLength: number; shortCheckRate: number }
  segments: {
    distribution: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number }
    pacBySegment: { TUTOR: number; STUDENT: number; PARENT: number; unknown: number }
  }
}

const pct = (v: number | null) => (v === null ? '—' : `${(v * 100).toFixed(1)}%`)

const isoDaysAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const AdminMetrics: FC = () => {
  const [from, setFrom] = useState(isoDaysAgo(56))
  const [to, setTo] = useState(isoDaysAgo(0))
  const [data, setData] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api
      .get(`/admin/analytics?from=${from}&to=${to}`)
      .then((res) => setData(res.data?.data ?? null))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [from, to])

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Метрики</h1>

      <div className={styles.controls}>
        <label>От<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label>До<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        {loading && <span>Загрузка…</span>}
      </div>

      {data && (
        <>
          <div className={styles.cards}>
            <div className={styles.card}>
              <div className={styles.cardLabel}>PAC (текущая неделя)</div>
              <div className={styles.cardValue}>{data.nsm.current}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>WoW рост PAC</div>
              <div className={styles.cardValue}>{pct(data.nsm.wowGrowthPct === null ? null : data.nsm.wowGrowthPct / 100)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Activation Rate</div>
              <div className={styles.cardValue}>{pct(data.newPac.activationRate)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Free → Paid CR</div>
              <div className={styles.cardValue}>{pct(data.newPac.freeToPaidCR)}</div>
            </div>
            <div className={styles.card}>
              <div className={styles.cardLabel}>Выручка (период)</div>
              <div className={styles.cardValue}>{data.backup.revenue.toLocaleString('ru-RU')} ₽</div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>PAC по неделям (New / Retained / Reactivated)</div>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.nsm.pacByWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="pac" name="PAC" stroke="#2563eb" strokeWidth={2} />
                  <Line type="monotone" dataKey="new" name="New" stroke="#16a34a" />
                  <Line type="monotone" dataKey="retained" name="Retained" stroke="#9333ea" />
                  <Line type="monotone" dataKey="reactivated" name="Reactivated" stroke="#ea580c" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Регистрации по неделям</div>
            <div className={styles.chartBox}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.newPac.registrationsByWeek}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" name="Регистрации" stroke="#2563eb" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Каналы регистрации / Микс тарифов</div>
            <table className={styles.table}>
              <tbody>
                {Object.entries(data.newPac.byChannel).map(([k, v]) => (
                  <tr key={`ch-${k}`}><td>Канал: {k}</td><td>{v}</td></tr>
                ))}
                {Object.entries(data.newPac.tariffMix).map(([k, v]) => (
                  <tr key={`tf-${k}`}><td>Тариф: {k}</td><td>{v}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Retained: ретеншен подписки и качество</div>
            <table className={styles.table}>
              <thead><tr><th>Неделя</th><th>Sub. retention</th><th>ARPC</th></tr></thead>
              <tbody>
                {data.retained.subscriptionRetentionByWeek.map((r, i) => (
                  <tr key={r.week}>
                    <td>{r.week}</td>
                    <td>{pct(r.rate)}</td>
                    <td>{data.retained.arpcByWeek[i]?.arpc.toFixed(2) ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p>Dislike rate: {pct(data.retained.quality.dislikeRate)} · Средний балл: {data.retained.quality.avgScore?.toFixed(1) ?? '—'}</p>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Anti-fraud guardrails</div>
            <table className={styles.table}>
              <tbody>
                <tr><td>% проверок с дублем текста (норма &lt; 5%)</td><td>{pct(data.guardrails.duplicateTextRate)}</td></tr>
                <tr><td>Медианная длина текста (норма &gt; 100)</td><td>{data.guardrails.medianTextLength}</td></tr>
                <tr><td>% коротких проверок (&lt; 50 симв)</td><td>{pct(data.guardrails.shortCheckRate)}</td></tr>
              </tbody>
            </table>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Сегменты пользователей</div>
            <table className={styles.table}>
              <thead><tr><th>Сегмент</th><th>Всего</th><th>PAC за период</th></tr></thead>
              <tbody>
                <tr><td>Репетитор</td><td>{data.segments.distribution.TUTOR}</td><td>{data.segments.pacBySegment.TUTOR}</td></tr>
                <tr><td>Ученик</td><td>{data.segments.distribution.STUDENT}</td><td>{data.segments.pacBySegment.STUDENT}</td></tr>
                <tr><td>Родитель</td><td>{data.segments.distribution.PARENT}</td><td>{data.segments.pacBySegment.PARENT}</td></tr>
                <tr><td>Не указан</td><td>{data.segments.distribution.unknown}</td><td>{data.segments.pacBySegment.unknown}</td></tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default AdminMetrics
