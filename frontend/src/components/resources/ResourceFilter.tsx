'use client'

import { ResourceType } from '@/services/resources.service'
import styles from './ResourceFilter.module.css'

const FILTERS: { label: string; value: ResourceType | 'ALL' }[] = [
  { label: 'Все', value: 'ALL' },
  { label: 'Статьи', value: 'ARTICLE' },
  { label: 'Чеклисты', value: 'CHECKLIST' },
  { label: 'Тренажёры', value: 'TRAINER' },
  { label: 'Шаблоны', value: 'TEMPLATE' },
]

interface Props {
  active: ResourceType | 'ALL'
  onChange: (value: ResourceType | 'ALL') => void
}

export default function ResourceFilter({ active, onChange }: Props) {
  return (
    <div className={styles.filters}>
      {FILTERS.map((f) => (
        <button
          key={f.value}
          className={`${styles.tab} ${active === f.value ? styles.tab_active : ''}`}
          onClick={() => onChange(f.value)}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}
