import type { MetadataRoute } from 'next'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://checkmateai.ru'

async function fetchAllResources(): Promise<{ slug: string; createdAt: string }[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/resources?limit=1000`, {
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json()
    return json.data?.items ?? []
  } catch {
    return []
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const resources = await fetchAllResources()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/resources`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
  ]

  const resourceRoutes: MetadataRoute.Sitemap = resources.map((r) => ({
    url: `${SITE_URL}/resources/${r.slug}`,
    lastModified: new Date(r.createdAt),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [...staticRoutes, ...resourceRoutes]
}
