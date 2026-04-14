'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import styles from './AdminPromos.module.css'

interface PromoCode {
  id: string
  code: string
  days: number
  description: string | null
  maxUses: number | null
  usedCount: number
  expiresAt: string | null
  createdAt: string
  _count: { usages: number }
}

const LIMIT = 20

const AdminPromos: FC = () => {
  const [promos, setPromos] = useState<PromoCode[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [code, setCode] = useState('')
  const [days, setDays] = useState('')
  const [description, setDescription] = useState('')
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const fetchPromos = async (p: number) => {
    try {
      const res = await api.get(`/admin/promo?page=${p}&limit=${LIMIT}`)
      const data = res.data?.data
      setPromos(data?.promos ?? [])
      setTotalPages(data?.totalPages ?? 1)
    } catch {}
  }

  useEffect(() => { fetchPromos(page) }, [page])

  const handleCreate = async () => {
    setSuccess('')
    setError('')
    if (!code || !days) { setError('Код и количество дней обязательны'); return }
    try {
      await api.post('/admin/promo', {
        code: code.toUpperCase(),
        days: parseInt(days),
        description: description || undefined,
        maxUses: maxUses ? parseInt(maxUses) : undefined,
        expiresAt: expiresAt || undefined,
      })
      setSuccess(`Промокод ${code.toUpperCase()} создан`)
      setCode('')
      setDays('')
      setDescription('')
      setMaxUses('')
      setExpiresAt('')
      fetchPromos(1)
      setPage(1)
    } catch {
      setError('Ошибка при создании промокода')
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Промокоды</h1>

      <div className={styles.form}>
        <div className={styles.formTitle}>Создать промокод</div>
        <div className={styles.field}>
          <label className={styles.label}>Код *</label>
          <input className={styles.input} value={code} onChange={e => setCode(e.target.value)} placeholder='SUMMER2025' />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Дней *</label>
          <input className={styles.input} type='number' min={1} value={days} onChange={e => setDays(e.target.value)} placeholder='30' />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Описание</label>
          <input className={styles.input} value={description} onChange={e => setDescription(e.target.value)} placeholder='Летняя акция' />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Макс. использований</label>
          <input className={styles.input} type='number' min={1} value={maxUses} onChange={e => setMaxUses(e.target.value)} placeholder='∞' />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Истекает</label>
          <input className={styles.input} type='date' value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        {success && <div className={styles.success}>{success}</div>}
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.submitBtn} onClick={handleCreate}>Создать</button>
      </div>

      <table className={styles.table}>
        <thead>
          <tr>
            <th>Код</th>
            <th>Описание</th>
            <th>Дней</th>
            <th>Использований</th>
            <th>Истекает</th>
            <th>Создан</th>
          </tr>
        </thead>
        <tbody>
          {promos.map(p => (
            <tr key={p.id}>
              <td><span className={styles.code}>{p.code}</span></td>
              <td>{p.description ?? '—'}</td>
              <td>{p.days}</td>
              <td>{p._count.usages}{p.maxUses ? ` / ${p.maxUses}` : ''}</td>
              <td>{formatDate(p.expiresAt)}</td>
              <td>{formatDate(p.createdAt)}</td>
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

export default AdminPromos
