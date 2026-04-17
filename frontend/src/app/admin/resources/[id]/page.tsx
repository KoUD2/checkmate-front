'use client'

import resourcesService, { Resource } from '@/services/resources.service'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ResourceForm from '../ResourceForm'
import styles from '../new/page.module.css'

export default function EditResourcePage() {
  const { id } = useParams<{ id: string }>()
  const [resource, setResource] = useState<Resource | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    resourcesService
      .adminList(1, 200)
      .then((res) => {
        const found = res.items.find((r) => r.id === id) as Resource | undefined
        setResource(found ?? null)
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ padding: 40, color: '#9ca3af' }}>Загрузка...</div>
  if (!resource) return <div style={{ padding: 40, color: '#ef4444' }}>Не найдено</div>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/resources" className={styles.back}>← Назад</Link>
        <h1 className={styles.title}>Редактировать</h1>
      </div>
      <ResourceForm initial={resource} resourceId={id} />
    </div>
  )
}
