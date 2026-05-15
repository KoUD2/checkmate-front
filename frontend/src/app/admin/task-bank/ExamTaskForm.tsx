'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/shared/utils/api'
import examTasksService, {
	ExamTask,
	TaskFormat,
	ExamSection,
	AiTaskType,
	CreateExamTaskPayload,
} from '@/services/exam-tasks.service'
import styles from './ExamTaskForm.module.css'

const SECTION_OPTIONS: { value: ExamSection; label: string }[] = [
	{ value: 'LISTENING', label: 'Аудирование' },
	{ value: 'READING', label: 'Чтение' },
	{ value: 'GRAMMAR', label: 'Грамматика' },
	{ value: 'WRITING', label: 'Письмо' },
	{ value: 'SPEAKING', label: 'Говорение' },
]

const FORMAT_OPTIONS: { value: TaskFormat; label: string }[] = [
	{ value: 'MCQ', label: 'MCQ' },
	{ value: 'MATCHING', label: 'Matching' },
	{ value: 'TRUE_FALSE', label: 'True/False' },
	{ value: 'OPEN_CLOZE', label: 'Open Cloze' },
	{ value: 'WORD_FORMATION', label: 'Word Formation' },
	{ value: 'AI_CHECK', label: 'AI Проверка (37–42)' },
]

const AI_TASK_OPTIONS: { value: AiTaskType; label: string }[] = [
	{ value: 'TASK37', label: 'Задание 37 (Письмо/Эссе)' },
	{ value: 'TASK38', label: 'Задание 38 (Описание таблицы/графика)' },
	{ value: 'TASK39', label: 'Задание 39 (Чтение вслух)' },
	{ value: 'TASK40', label: 'Задание 40 (Условный диалог — вопросы)' },
	{ value: 'TASK41', label: 'Задание 41 (Условный диалог — интервью)' },
	{ value: 'TASK42', label: 'Задание 42 (Монолог)' },
]

interface OptionRow {
	optionText: string
	matchText: string
	isCorrect: boolean
}

interface Props {
	initial?: Partial<ExamTask>
	taskId?: string
}

export default function ExamTaskForm({ initial, taskId }: Props) {
	const router = useRouter()
	const [form, setForm] = useState({
		title: initial?.title ?? '',
		section: (initial?.section ?? 'READING') as ExamSection,
		format: (initial?.format ?? 'MCQ') as TaskFormat,
		body: initial?.body ?? '',
		source: initial?.source ?? '',
		explanation: initial?.explanation ?? '',
		correctAnswer: initial?.correctAnswer ?? '',
		aiTaskType: (initial?.aiTaskType ?? 'TASK37') as AiTaskType,
		audioUrl: initial?.audioUrl ?? '',
	})
	const [options, setOptions] = useState<OptionRow[]>(
		initial?.options && initial.options.length > 0
			? initial.options.map((o) => ({
					optionText: o.optionText,
					matchText: o.matchText ?? '',
					isCorrect: o.isCorrect,
				}))
			: [
					{ optionText: '', matchText: '', isCorrect: false },
					{ optionText: '', matchText: '', isCorrect: false },
				]
	)
	const [error, setError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [audioStatus, setAudioStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>(
		initial?.audioUrl ? 'success' : 'idle'
	)
	const fileInputRef = useRef<HTMLInputElement | null>(null)

	const set = (key: keyof typeof form, value: string) =>
		setForm((prev) => ({ ...prev, [key]: value }))

	const handleAddOption = () =>
		setOptions((prev) => [...prev, { optionText: '', matchText: '', isCorrect: false }])

	const handleRemoveOption = (idx: number) =>
		setOptions((prev) => prev.filter((_, i) => i !== idx))

	const handleSetMcqCorrect = (idx: number) =>
		setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })))

	const handleUpdateOption = (idx: number, field: keyof OptionRow, value: string | boolean) =>
		setOptions((prev) =>
			prev.map((o, i) => (i === idx ? { ...o, [field]: value } : o))
		)

	const handleAudioUpload = async (file: File) => {
		if (file.size > 15 * 1024 * 1024 || file.type !== 'audio/mpeg') {
			setError('Допустимый формат: MP3, максимум 15 МБ')
			return
		}
		setAudioStatus('uploading')
		try {
			const fileName = `exam-tasks/${crypto.randomUUID()}.mp3`
			const res = await api.post<{ data: { presignedUrl: string; cdnUrl: string } }>(
				'/storage/presign',
				{ fileName, contentType: 'audio/mpeg' }
			)
			const { presignedUrl, cdnUrl } = res.data.data
			const putRes = await fetch(presignedUrl, {
				method: 'PUT',
				headers: { 'Content-Type': 'audio/mpeg' },
				body: file,
			})
			if (!putRes.ok) throw new Error('PUT failed')
			set('audioUrl', cdnUrl)
			setAudioStatus('success')
			setError(null)
		} catch {
			setAudioStatus('error')
			setError('Ошибка загрузки. Попробуйте ещё раз.')
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError(null)
		setSaving(true)

		// Validation gate
		if (form.format === 'MCQ') {
			if (options.length < 2) {
				setError('Добавьте минимум 2 варианта ответа')
				setSaving(false)
				return
			}
			if (!options.some((o) => o.isCorrect)) {
				setError('Отметьте правильный вариант')
				setSaving(false)
				return
			}
		}
		if (form.format === 'MATCHING') {
			const hasValidPair = options.some(
				(o) => o.isCorrect && o.optionText.trim() && o.matchText.trim()
			)
			if (!hasValidPair) {
				setError('Добавьте минимум 1 правильную пару')
				setSaving(false)
				return
			}
		}
		if (form.format === 'TRUE_FALSE') {
			if (form.correctAnswer !== 'True' && form.correctAnswer !== 'False') {
				setError('Выберите правильный ответ')
				setSaving(false)
				return
			}
		}
		if (form.format === 'OPEN_CLOZE' || form.format === 'WORD_FORMATION') {
			if (!form.correctAnswer.trim()) {
				setError('Введите правильный ответ')
				setSaving(false)
				return
			}
		}

		try {
			const common = {
				title: form.title,
				section: form.section,
				format: form.format,
				body: form.body || undefined,
				source: form.source || undefined,
				explanation: form.explanation || undefined,
				audioUrl: form.audioUrl || undefined,
			}

			let payload: CreateExamTaskPayload | Partial<CreateExamTaskPayload>

			if (form.format === 'MCQ' || form.format === 'MATCHING') {
				payload = {
					...common,
					options: options
						.filter((o) => o.optionText.trim())
						.map((o) => ({
							optionText: o.optionText,
							matchText: o.matchText || undefined,
							isCorrect: o.isCorrect,
						})),
				}
			} else if (
				form.format === 'TRUE_FALSE' ||
				form.format === 'OPEN_CLOZE' ||
				form.format === 'WORD_FORMATION'
			) {
				payload = {
					...common,
					correctAnswer: form.correctAnswer,
				}
			} else {
				// AI_CHECK
				payload = {
					...common,
					aiTaskType: form.aiTaskType,
				}
			}

			if (taskId) {
				await examTasksService.update(taskId, payload)
			} else {
				await examTasksService.create(payload as CreateExamTaskPayload)
			}
			router.push('/admin/task-bank')
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string | string[] } } })?.response?.data
					?.message ?? 'Ошибка сохранения. Проверьте поля и попробуйте снова.'
			setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
		} finally {
			setSaving(false)
		}
	}

	const mcqOptions = options
	const matchingPairs = options.filter((o) => o.isCorrect)
	const matchingDistractors = options.filter((o) => !o.isCorrect)

	const truncateUrl = (url: string) =>
		url.length > 40 ? url.slice(0, 37) + '...' : url

	return (
		<form onSubmit={handleSubmit} className={styles.form}>
			{/* Section A: Common fields */}
			<fieldset className={styles.fieldset}>
				<legend className={styles.legend}>Основные поля</legend>

				<div className={styles.field}>
					<label className={styles.label} htmlFor="ef-title">
						Название *
					</label>
					<input
						id="ef-title"
						className={styles.input}
						value={form.title}
						onChange={(e) => set('title', e.target.value)}
						required
						placeholder="Краткое название задания (для поиска в банке)"
					/>
				</div>

				<div className={styles.fieldRow}>
					<div className={styles.field}>
						<label className={styles.label} htmlFor="ef-section">
							Раздел *
						</label>
						<select
							id="ef-section"
							className={styles.select}
							value={form.section}
							onChange={(e) => set('section', e.target.value as ExamSection)}
						>
							{SECTION_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>

					<div className={styles.field}>
						<label className={styles.label} htmlFor="ef-format">
							Формат *
						</label>
						<select
							id="ef-format"
							className={styles.select}
							value={form.format}
							onChange={(e) => set('format', e.target.value as TaskFormat)}
						>
							{FORMAT_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
				</div>

				<div className={styles.field}>
					<label className={styles.label} htmlFor="ef-body">
						Текст задания *
					</label>
					<textarea
						id="ef-body"
						className={styles.textarea}
						rows={4}
						value={form.body}
						onChange={(e) => set('body', e.target.value)}
						required
						placeholder="Инструкция или условие задания для студента"
					/>
				</div>

				<div className={styles.field}>
					<label className={styles.label} htmlFor="ef-source">
						Источник
					</label>
					<input
						id="ef-source"
						className={styles.input}
						value={form.source}
						onChange={(e) => set('source', e.target.value)}
						placeholder="ФИПИ 2024"
					/>
				</div>
			</fieldset>

			{/* Section B: Format-specific fields */}
			{form.format === 'MCQ' && (
				<fieldset className={styles.fieldset}>
					<legend className={styles.legend}>Варианты ответа</legend>
					{mcqOptions.map((opt, idx) => (
						<div key={idx} className={styles.optionRow}>
							<input
								type="radio"
								name="mcq_correct"
								checked={opt.isCorrect}
								onChange={() => handleSetMcqCorrect(idx)}
								aria-label="Правильный вариант"
							/>
							<input
								className={styles.input}
								style={{ flex: 1 }}
								value={opt.optionText}
								onChange={(e) => handleUpdateOption(idx, 'optionText', e.target.value)}
								placeholder="Вариант ответа"
							/>
							{mcqOptions.length > 2 && (
								<button
									type="button"
									className={styles.removeBtn}
									aria-label="Удалить вариант ответа"
									onClick={() => handleRemoveOption(idx)}
								>
									×
								</button>
							)}
						</div>
					))}
					<button
						type="button"
						className={styles.ghostBtn}
						onClick={handleAddOption}
						disabled={mcqOptions.length >= 6}
					>
						+ Добавить вариант
					</button>
				</fieldset>
			)}

			{form.format === 'MATCHING' && (
				<fieldset className={styles.fieldset}>
					<legend className={styles.legend}>Пары для сопоставления</legend>

					<fieldset className={styles.fieldset}>
						<legend className={styles.legend}>Правильные пары</legend>
						{matchingPairs.map((opt, idx) => {
							const globalIdx = options.indexOf(opt)
							return (
								<div key={idx} className={styles.optionRow}>
									<input
										className={styles.input}
										style={{ flex: 1 }}
										value={opt.optionText}
										onChange={(e) =>
											handleUpdateOption(globalIdx, 'optionText', e.target.value)
										}
										placeholder="Левая часть (напр. 1. She ___ tennis)"
									/>
									<span style={{ color: '#6b7280', fontSize: 14 }}>→</span>
									<input
										className={styles.input}
										style={{ flex: 1 }}
										value={opt.matchText}
										onChange={(e) =>
											handleUpdateOption(globalIdx, 'matchText', e.target.value)
										}
										placeholder="Правая часть (напр. plays)"
									/>
									<button
										type="button"
										className={styles.removeBtn}
										aria-label="Удалить пару"
										onClick={() => handleRemoveOption(globalIdx)}
									>
										×
									</button>
								</div>
							)
						})}
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() =>
								setOptions((prev) => [
									...prev,
									{ optionText: '', matchText: '', isCorrect: true },
								])
							}
						>
							+ Добавить пару
						</button>
					</fieldset>

					<fieldset className={styles.fieldset}>
						<legend className={styles.legend}>
							Отвлекающие варианты (дистракторы)
						</legend>
						{matchingDistractors.map((opt, idx) => {
							const globalIdx = options.indexOf(opt)
							return (
								<div key={idx} className={styles.optionRow}>
									<input
										className={styles.input}
										style={{ flex: 1 }}
										value={opt.optionText}
										onChange={(e) =>
											handleUpdateOption(globalIdx, 'optionText', e.target.value)
										}
										placeholder="Текст дистрактора"
									/>
									<button
										type="button"
										className={styles.removeBtn}
										aria-label="Удалить дистрактор"
										onClick={() => handleRemoveOption(globalIdx)}
									>
										×
									</button>
								</div>
							)
						})}
						<button
							type="button"
							className={styles.ghostBtn}
							onClick={() =>
								setOptions((prev) => [
									...prev,
									{ optionText: '', matchText: '', isCorrect: false },
								])
							}
						>
							+ Добавить дистрактор
						</button>
						<p className={styles.helperText}>
							Дистракторы отображаются в общем пуле, но не входят в правильные пары
						</p>
					</fieldset>
				</fieldset>
			)}

			{form.format === 'TRUE_FALSE' && (
				<fieldset className={styles.fieldset}>
					<legend className={styles.legend}>Правильный ответ</legend>
					<div className={styles.field}>
						<select
							className={styles.select}
							value={form.correctAnswer}
							onChange={(e) => set('correctAnswer', e.target.value)}
						>
							<option value="">— Выберите —</option>
							<option value="True">True</option>
							<option value="False">False</option>
						</select>
					</div>
				</fieldset>
			)}

			{form.format === 'OPEN_CLOZE' && (
				<fieldset className={styles.fieldset}>
					<legend className={styles.legend}>Правильный ответ</legend>
					<div className={styles.field}>
						<input
							className={styles.input}
							value={form.correctAnswer}
							onChange={(e) => set('correctAnswer', e.target.value)}
							placeholder="Одно слово или фраза (напр. have been)"
						/>
					</div>
				</fieldset>
			)}

			{form.format === 'WORD_FORMATION' && (
				<fieldset className={styles.fieldset}>
					<legend className={styles.legend}>Правильный ответ</legend>
					<div className={styles.field}>
						<input
							className={styles.input}
							value={form.correctAnswer}
							onChange={(e) => set('correctAnswer', e.target.value)}
							placeholder="Правильная форма слова (напр. BEAUTIFUL)"
						/>
					</div>
				</fieldset>
			)}

			{form.format === 'AI_CHECK' && (
				<fieldset className={styles.fieldset}>
					<legend className={styles.legend}>Тип AI-задания</legend>
					<div className={styles.field}>
						<select
							className={styles.select}
							value={form.aiTaskType}
							onChange={(e) => set('aiTaskType', e.target.value as AiTaskType)}
						>
							{AI_TASK_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{o.label}
								</option>
							))}
						</select>
					</div>
					<p className={styles.helperText}>
						AI-задания проверяются через GeminiService по критериям ФИПИ
					</p>
				</fieldset>
			)}

			{/* Section C: Audio upload (only when LISTENING) */}
			{form.section === 'LISTENING' && (
				<fieldset className={styles.fieldset}>
					<legend className={styles.legend}>Аудиофайл</legend>
					{audioStatus === 'idle' && (
						<>
							<button
								type="button"
								className={styles.ghostBtn}
								onClick={() => fileInputRef.current?.click()}
							>
								Загрузить аудио (MP3, макс. 15 МБ)
							</button>
							<input
								ref={fileInputRef}
								type="file"
								accept="audio/mpeg"
								onChange={(e) => {
									const file = e.target.files?.[0]
									if (file) handleAudioUpload(file)
								}}
								style={{ display: 'none' }}
							/>
						</>
					)}
					{audioStatus === 'uploading' && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 14 }}>
							<span className={styles.spinner} />
							Загружается...
						</div>
					)}
					{audioStatus === 'success' && (
						<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
							<span className={styles.audioChip}>✓ Файл загружен</span>
							<span className={styles.audioUrl}>{truncateUrl(form.audioUrl)}</span>
							<button
								type="button"
								className={styles.audioRemove}
								onClick={() => {
									set('audioUrl', '')
									setAudioStatus('idle')
								}}
							>
								Удалить
							</button>
						</div>
					)}
					{audioStatus === 'error' && (
						<p style={{ color: '#dc2626', fontSize: 14, margin: 0 }}>
							Ошибка загрузки. Попробуйте ещё раз.
						</p>
					)}
				</fieldset>
			)}

			{/* Error banner */}
			{error !== null && <div className={styles.error}>{error}</div>}

			{/* Footer */}
			<div className={styles.footer}>
				<button type="submit" className={styles.btn_save} disabled={saving}>
					{saving ? 'Сохранение...' : taskId ? 'Сохранить' : 'Создать задание'}
				</button>
				<Link href="/admin/task-bank" className={styles.btn_cancel}>
					{taskId ? 'Вернуться без изменений' : 'Вернуться к банку'}
				</Link>
			</div>
		</form>
	)
}
