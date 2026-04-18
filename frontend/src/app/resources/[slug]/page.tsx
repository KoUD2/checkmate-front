import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Script from 'next/script'
import ResourceDetailClient from './ResourceDetailClient'
import styles from './ResourceDetail.module.css'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://checkmateai.ru'

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

  const title = resource.seoTitle || resource.title
  const description = resource.seoDescription || resource.description
  const canonicalUrl = `${SITE_URL}/resources/${slug}`

  return {
    title,
    description,
    keywords: resource.seoKeywords || undefined,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: resource.createdAt,
      modifiedTime: resource.updatedAt,
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

  const canonicalUrl = `${SITE_URL}/resources/${slug}`
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: resource.seoTitle || resource.title,
    description: resource.seoDescription || resource.description,
    url: canonicalUrl,
    datePublished: resource.createdAt,
    dateModified: resource.updatedAt,
    publisher: {
      '@type': 'Organization',
      name: 'CheckMate',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  }

  return (
    <div className={styles.page}>
      <Script
        id={`jsonld-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className={styles.container}>
        <Link href="/resources" className={styles.back}>
          ← Все материалы
        </Link>
        <ResourceDetailClient resource={resource} />
      </div>
    </div>
  )
}
