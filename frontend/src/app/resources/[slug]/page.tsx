import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import ResourceDetailClient from './ResourceDetailClient'
import styles from './ResourceDetail.module.css'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'

async function fetchResource(slug: string) {
  try {
    const res = await fetch(`${BACKEND_URL}/resources/${slug}`, { cache: 'no-store' })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const resource = await fetchResource(slug)
  if (!resource) return { title: 'Материал не найден' }

  return {
    title: resource.seoTitle || resource.title,
    description: resource.seoDescription || resource.description,
    keywords: resource.seoKeywords || undefined,
    openGraph: {
      title: resource.seoTitle || resource.title,
      description: resource.seoDescription || resource.description,
    },
  }
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const resource = await fetchResource(slug)
  if (!resource) notFound()

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link href="/resources" className={styles.back}>
          ← Все материалы
        </Link>
        <ResourceDetailClient resource={resource} />
      </div>
    </div>
  )
}
