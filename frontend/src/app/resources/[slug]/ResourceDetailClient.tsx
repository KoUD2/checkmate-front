'use client'

import ArticleView from '@/components/resources/ArticleView'
import ChecklistView from '@/components/resources/ChecklistView'
import TrainerView from '@/components/resources/TrainerView'
import TemplateView from '@/components/resources/TemplateView'
import { Resource } from '@/services/resources.service'
import styles from './ResourceDetail.module.css'

const TYPE_LABELS: Record<string, string> = {
  ARTICLE: 'Статья',
  CHECKLIST: 'Чеклист',
  TRAINER: 'Тренажёр',
  TEMPLATE: 'Шаблоны',
}

interface Props {
  resource: Resource
}

export default function ResourceDetailClient({ resource }: Props) {
  return (
    <article className={styles.article}>
      <div className={styles.header}>
        <span className={`${styles.badge} ${styles[`badge_${resource.type.toLowerCase()}`]}`}>
          {TYPE_LABELS[resource.type]}
        </span>
        <h1 className={styles.title}>{resource.title}</h1>
        <p className={styles.description}>{resource.description}</p>
      </div>
      <div className={styles.content}>
        {resource.type === 'ARTICLE' && (
          <ArticleView content={resource.content as { body: string }} />
        )}
        {resource.type === 'CHECKLIST' && (
          <ChecklistView content={resource.content as { items: { text: string; hint?: string }[] }} />
        )}
        {resource.type === 'TRAINER' && (
          <TrainerView
            content={
              resource.content as {
                questions: {
                  text: string
                  type: 'choice' | 'fill'
                  options?: string[]
                  answer: string
                }[]
              }
            }
          />
        )}
        {resource.type === 'TEMPLATE' && (
          <TemplateView
            content={
              resource.content as {
                body: string
                phrases: { label: string; text: string }[]
              }
            }
          />
        )}
      </div>
    </article>
  )
}
