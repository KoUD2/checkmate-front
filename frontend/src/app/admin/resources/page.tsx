'use client'

import resourcesService, { Resource } from '@/services/resources.service'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import styles from './AdminResources.module.css'

const TYPE_LABELS: Record<string, string> = {
  ARTICLE: 'Статья',
  CHECKLIST: 'Чеклист',
  TRAINER: 'Тренажёр',
  TEMPLATE: 'Шаблоны',
}

export default function AdminResourcesPage() {
  const [items, setItems] = useState<Resource[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchItems = async (p: number) => {
    try {
      const res = await resourcesService.adminList(p)
      setItems(res.items as Resource[])
      setTotalPages(res.totalPages)
    } catch {}
  }

  useEffect(() => { fetchItems(page) }, [page])

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот материал?')) return
    try {
      await resourcesService.remove(id)
      fetchItems(page)
    } catch {}
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Полезное</h1>
        <Link href="/admin/resources/new" className={styles.btn_create}>
          + Создать
        </Link>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Заголовок</th>
            <th>Тип</th>
            <th>Slug</th>
            <th>Статус</th>
            <th>Дата</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>{TYPE_LABELS[r.type] ?? r.type}</td>
              <td className={styles.slug}>{r.slug}</td>
              <td>
                <span className={r.published ? styles.status_published : styles.status_draft}>
                  {r.published ? 'Опубликован' : 'Черновик'}
                </span>
              </td>
              <td>{formatDate(r.createdAt)}</td>
              <td className={styles.actions}>
                <Link href={`/admin/resources/${r.id}`} className={styles.btn_edit}>
                  Изменить
                </Link>
                <button className={styles.btn_delete} onClick={() => handleDelete(r.id)}>
                  Удалить
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 && (
            <tr>
              <td colSpan={6} className={styles.empty}>Нет материалов</td>
            </tr>
          )}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>←</button>
          <span>{page} / {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>→</button>
        </div>
      )}
    </div>
  )
}
