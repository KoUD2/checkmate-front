import Link from 'next/link'
import { ResourceListItem, ResourceType } from '@/services/resources.service'
import styles from './ResourceCard.module.css'

const TYPE_LABELS: Record<ResourceType, string> = {
  ARTICLE: 'Статья',
  CHECKLIST: 'Чеклист',
  TRAINER: 'Тренажёр',
  TEMPLATE: 'Шаблоны',
}

interface Props {
  resource: ResourceListItem
}

export default function ResourceCard({ resource }: Props) {
  return (
    <Link href={`/resources/${resource.slug}`} className={styles.card}>
      <span className={`${styles.badge} ${styles[`badge_${resource.type.toLowerCase()}`]}`}>
        {TYPE_LABELS[resource.type]}
      </span>
      <h3 className={styles.title}>{resource.title}</h3>
      <p className={styles.description}>{resource.description}</p>
    </Link>
  )
}
