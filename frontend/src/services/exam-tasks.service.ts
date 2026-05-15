import api from '@/shared/utils/api'

export type TaskFormat = 'MCQ' | 'MATCHING' | 'TRUE_FALSE' | 'OPEN_CLOZE' | 'WORD_FORMATION' | 'AI_CHECK'
export type ExamSection = 'LISTENING' | 'READING' | 'GRAMMAR' | 'WRITING' | 'SPEAKING'
export type AiTaskType = 'TASK37' | 'TASK38' | 'TASK39' | 'TASK40' | 'TASK41' | 'TASK42'

export interface ExamTaskOption {
  id?: string
  optionText: string
  matchText?: string | null
  isCorrect: boolean
}

export interface ExamTaskListItem {
  id: string
  format: TaskFormat
  section: ExamSection
  title: string
  source: string | null
  audioUrl: string | null
  aiTaskType: AiTaskType | null
  createdAt: string
  updatedAt: string
  _count?: { options: number }
}

export interface ExamTask extends ExamTaskListItem {
  body: string | null
  correctAnswer: string | null
  explanation: string | null
  options: ExamTaskOption[]
}

export interface ExamTaskListResult {
  items: ExamTaskListItem[]
  total: number
  totalPages: number
}

export interface ExamTaskListParams {
  section?: ExamSection
  format?: TaskFormat
  source?: string
  page?: number
  limit?: number
}

export interface CreateExamTaskPayload {
  format: TaskFormat
  section: ExamSection
  title: string
  body?: string
  audioUrl?: string
  correctAnswer?: string
  source?: string
  explanation?: string
  aiTaskType?: AiTaskType
  options?: Array<{ optionText: string; matchText?: string; isCorrect: boolean }>
}

export type RemoveResult = { needsConfirm: true; variantNames: string[] } | { deleted: true }

const examTasksService = {
  async list(params: ExamTaskListParams = {}): Promise<ExamTaskListResult> {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(params.limit ?? 20),
    })
    if (params.section) qs.set('section', params.section)
    if (params.format) qs.set('format', params.format)
    if (params.source) qs.set('source', params.source)
    const res = await api.get<{ data: ExamTaskListResult }>(`/admin/exam-tasks?${qs.toString()}`)
    return res.data.data
  },

  async getById(id: string): Promise<ExamTask> {
    const res = await api.get<{ data: ExamTask }>(`/admin/exam-tasks/${id}`)
    return res.data.data
  },

  async create(dto: CreateExamTaskPayload): Promise<ExamTask> {
    const res = await api.post<{ data: ExamTask }>('/admin/exam-tasks', dto)
    return res.data.data
  },

  async update(id: string, dto: Partial<CreateExamTaskPayload>): Promise<ExamTask> {
    const res = await api.patch<{ data: ExamTask }>(`/admin/exam-tasks/${id}`, dto)
    return res.data.data
  },

  async remove(id: string, confirm = false): Promise<RemoveResult> {
    const url = `/admin/exam-tasks/${id}${confirm ? '?confirm=true' : ''}`
    const res = await api.delete<{ data: RemoveResult }>(url)
    return res.data.data
  },
}

export default examTasksService
