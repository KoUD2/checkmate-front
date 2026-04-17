'use client'

import Link from 'next/link'
import ResourceForm from '../ResourceForm'
import styles from './page.module.css'

export default function NewResourcePage() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/resources" className={styles.back}>← Назад</Link>
        <h1 className={styles.title}>Новый материал</h1>
      </div>
      <ResourceForm />
    </div>
  )
}
