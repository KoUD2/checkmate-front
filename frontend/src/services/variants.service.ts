import api from '@/shared/utils/api'

export type { ExamSection, TaskFormat } from './exam-tasks.service'

import type { ExamSection, TaskFormat, AiTaskType, ExamTaskOption } from './exam-tasks.service'

export interface VariantTaskExamTaskMeta {
	id: string
	title: string
	section: ExamSection
	format: TaskFormat
	body?: string | null
	audioUrl?: string | null
	source?: string | null
	explanation?: string | null
	aiTaskType?: AiTaskType | null
	options?: ExamTaskOption[]
}

export interface VariantTask {
	id: string
	variantId: string
	examTaskId: string
	position: number
	examTask: VariantTaskExamTaskMeta
}

export interface VariantListItem {
	id: string
	title: string
	description: string | null
	published: boolean
	createdAt: string
	updatedAt: string
	variantTasks: VariantTask[]
	_count?: { variantTasks: number }
}

export interface VariantListResult {
	items: VariantListItem[]
	total: number
	totalPages: number
}

export interface CreateVariantPayload {
	title: string
	description?: string
	published?: boolean
}

export type UpdateVariantPayload = Partial<CreateVariantPayload>

const variantsService = {
	async adminList(page = 1, limit = 20): Promise<VariantListResult> {
		const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
		const res = await api.get<{ data: VariantListResult }>(`/admin/variants?${qs}`)
		return res.data.data
	},

	async adminGetById(id: string): Promise<VariantListItem> {
		const res = await api.get<{ data: VariantListItem }>(`/admin/variants/${id}`)
		return res.data.data
	},

	async adminCreate(dto: CreateVariantPayload): Promise<VariantListItem> {
		const res = await api.post<{ data: VariantListItem }>('/admin/variants', dto)
		return res.data.data
	},

	async adminUpdate(id: string, dto: UpdateVariantPayload): Promise<VariantListItem> {
		const res = await api.patch<{ data: VariantListItem }>(`/admin/variants/${id}`, dto)
		return res.data.data
	},

	async adminAssignTasks(id: string, taskIds: string[]): Promise<VariantListItem> {
		const res = await api.put<{ data: VariantListItem }>(`/admin/variants/${id}/tasks`, { taskIds })
		return res.data.data
	},

	async adminRemove(id: string): Promise<void> {
		await api.delete(`/admin/variants/${id}`)
	},

	async list(page = 1, limit = 20): Promise<VariantListResult> {
		const qs = new URLSearchParams({ page: String(page), limit: String(limit) })
		const res = await api.get<{ data: VariantListResult }>(`/variants?${qs}`)
		return res.data.data
	},

	async getById(id: string): Promise<VariantListItem> {
		const res = await api.get<{ data: VariantListItem }>(`/variants/${id}`)
		return res.data.data
	},
}

export default variantsService
