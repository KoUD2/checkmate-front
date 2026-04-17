import type { Metadata } from 'next'
import ResourcesListClient from './ResourcesListClient'
import styles from './ResourcesPage.module.css'

export const metadata: Metadata = {
  title: 'Полезное — материалы для подготовки к ЕГЭ',
  description:
    'Статьи, чеклисты, тренажёры и шаблоны для подготовки к заданиям ЕГЭ по английскому языку. Советы, стратегии и готовые клише для эссе и письма.',
  keywords: [
    'подготовка к ЕГЭ',
    'статьи ЕГЭ английский',
    'чеклист ЕГЭ',
    'тренажёр ЕГЭ',
    'шаблоны для эссе ЕГЭ',
    'клише ЕГЭ',
  ].join(', '),
  openGraph: {
    title: 'Полезное — материалы для подготовки к ЕГЭ',
    description: 'Статьи, чеклисты, тренажёры и шаблоны для подготовки к ЕГЭ по английскому.',
  },
}

export default function ResourcesPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Полезное</h1>
        <p className={styles.subtitle}>
          Материалы для подготовки к заданиям ЕГЭ по английскому языку
        </p>
        <ResourcesListClient />
      </div>
    </div>
  )
}
