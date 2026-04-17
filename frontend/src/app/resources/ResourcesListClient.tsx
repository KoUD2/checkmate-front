'use client'

import { useEffect, useState } from 'react'
import ResourceCard from '@/components/resources/ResourceCard'
import ResourceFilter from '@/components/resources/ResourceFilter'
import { ResourceListItem, ResourceType } from '@/services/resources.service'
import resourcesService from '@/services/resources.service'
import styles from './ResourcesPage.module.css'

export default function ResourcesListClient() {
  const [filter, setFilter] = useState<ResourceType | 'ALL'>('ALL')
  const [items, setItems] = useState<ResourceListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    resourcesService
      .list(filter === 'ALL' ? undefined : filter)
      .then((r) => setItems(r.items))
      .finally(() => setLoading(false))
  }, [filter])

  return (
    <>
      <ResourceFilter active={filter} onChange={setFilter} />
      {loading ? (
        <div className={styles.loading}>Загрузка...</div>
      ) : items.length === 0 ? (
        <div className={styles.empty}>Материалов пока нет</div>
      ) : (
        <div className={styles.grid}>
          {items.map((r) => (
            <ResourceCard key={r.id} resource={r} />
          ))}
        </div>
      )}
    </>
  )
}
