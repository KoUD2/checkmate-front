import type { ExamSection } from '@/services/attempts.service'

export const SECTION_LABEL: Record<ExamSection, string> = {
	LISTENING: 'Аудирование',
	READING:   'Чтение',
	GRAMMAR:   'Грамматика и лексика',
	WRITING:   'Письмо',
	SPEAKING:  'Говорение',
}

export const SECTION_ORDER: ExamSection[] = ['LISTENING', 'READING', 'GRAMMAR', 'WRITING', 'SPEAKING']
