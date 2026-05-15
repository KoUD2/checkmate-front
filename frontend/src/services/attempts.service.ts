import api from '@/shared/utils/api'

export type { ExamSection } from './exam-tasks.service'

import type { ExamSection } from './exam-tasks.service'

export type AttemptStatus = 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED' | 'FAILED'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface AttemptAnswer {
	id: string
	variantAttemptId: string
	examTaskId: string
	content: unknown
	playCount: number
	aiScore: number | null
	aiFeedback: unknown | null
	createdAt: string
	updatedAt: string
}

export interface AttemptWithAnswers {
	id: string
	userId: string
	variantId: string
	status: AttemptStatus
	startedAt: string
	endedAt: string | null
	updatedAt: string
	skippedSections: ExamSection[]
	answers: AttemptAnswer[]
}

const attemptsService = {
	async getOrCreate(variantId: string): Promise<AttemptWithAnswers> {
		const res = await api.get<{ data: AttemptWithAnswers }>(`/attempts/by-variant/${variantId}`)
		return res.data.data
	},

	async upsertAnswer(attemptId: string, taskId: string, content: unknown): Promise<AttemptAnswer> {
		const res = await api.put<{ data: AttemptAnswer }>(`/attempts/${attemptId}/answers/${taskId}`, { content })
		return res.data.data
	},

	async incrementPlay(attemptId: string, taskId: string): Promise<{ playCount: number }> {
		const res = await api.post<{ data: { playCount: number } }>(`/attempts/${attemptId}/answers/${taskId}/increment-play`)
		return res.data.data
	},

	async skipSection(attemptId: string, section: ExamSection, skip: boolean): Promise<AttemptWithAnswers> {
		const res = await api.patch<{ data: AttemptWithAnswers }>(`/attempts/${attemptId}/skip-section`, { section, skip })
		return res.data.data
	},

	async submit(attemptId: string): Promise<AttemptWithAnswers> {
		const res = await api.post<{ data: AttemptWithAnswers }>(`/attempts/${attemptId}/submit`)
		return res.data.data
	},
}

export default attemptsService
