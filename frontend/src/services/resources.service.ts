import api from '@/shared/utils/api'

export type ResourceType = 'ARTICLE' | 'CHECKLIST' | 'TRAINER' | 'TEMPLATE'

export interface ResourceListItem {
  id: string
  slug: string
  type: ResourceType
  title: string
  description: string
  createdAt: string
}

export interface Resource extends ResourceListItem {
  content: unknown
  published: boolean
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  updatedAt: string
}

export interface ResourcesListResult {
  items: ResourceListItem[]
  total: number
  totalPages: number
}

const resourcesService = {
  async list(type?: ResourceType, page = 1, limit = 20): Promise<ResourcesListResult> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (type) params.set('type', type)
    const res = await api.get<{ data: ResourcesListResult }>(`/resources?${params}`)
    return res.data.data
  },

  async getBySlug(slug: string): Promise<Resource> {
    const res = await api.get<{ data: Resource }>(`/resources/${slug}`)
    return res.data.data
  },

  async adminList(page = 1, limit = 20): Promise<ResourcesListResult & { items: Resource[] }> {
    const res = await api.get<{ data: ResourcesListResult & { items: Resource[] } }>(
      `/resources/admin/list?page=${page}&limit=${limit}`,
    )
    return res.data.data
  },

  async create(dto: Partial<Resource>): Promise<Resource> {
    const res = await api.post<{ data: Resource }>('/resources/admin', dto)
    return res.data.data
  },

  async update(id: string, dto: Partial<Resource>): Promise<Resource> {
    const res = await api.patch<{ data: Resource }>(`/resources/admin/${id}`, dto)
    return res.data.data
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/resources/admin/${id}`)
  },
}

export default resourcesService
