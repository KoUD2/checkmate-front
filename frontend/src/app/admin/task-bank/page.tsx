'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import examTasksService, {
	ExamSection,
	ExamTaskListItem,
	TaskFormat,
} from '@/services/exam-tasks.service'
import styles from './AdminTaskBank.module.css'
import DeleteWarningModal from './DeleteWarningModal'

const SECTION_LABELS: Record<ExamSection, string> = {
	LISTENING: 'Аудирование',
	READING: 'Чтение',
	GRAMMAR: 'Грамматика',
	WRITING: 'Письмо',
	SPEAKING: 'Говорение',
}

const FORMAT_LABELS: Record<TaskFormat, string> = {
	MCQ: 'MCQ',
	MATCHING: 'Matching',
	TRUE_FALSE: 'True / False',
	OPEN_CLOZE: 'Open Cloze',
	WORD_FORMATION: 'Word Formation',
	AI_CHECK: 'AI Проверка',
}

const formatDate = (iso: string): string => {
	const d = new Date(iso)
	return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

type ModalState = {
	mode: 'draft' | 'blocked'
	variantNames: string[]
	taskId: string
} | null

export default function AdminTaskBankPage() {
	const [items, setItems] = useState<ExamTaskListItem[]>([])
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)
	const [section, setSection] = useState<ExamSection | ''>('')
	const [format, setFormat] = useState<TaskFormat | ''>('')
	const [source, setSource] = useState('')
	const [loading, setLoading] = useState(false)
	const [modalState, setModalState] = useState<ModalState>(null)

	const sourceDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const fetchItems = async (overridePage?: number) => {
		setLoading(true)
		try {
			const result = await examTasksService.list({
				section: section || undefined,
				format: format || undefined,
				source: source || undefined,
				page: overridePage ?? page,
				limit: 20,
			})
			setItems(result.items)
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch {
			setItems([])
		} finally {
			setLoading(false)
		}
	}

	// Refetch on page, section, format changes
	useEffect(() => {
		fetchItems()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page, section, format])

	// Debounced source filter
	useEffect(() => {
		if (sourceDebounceRef.current) clearTimeout(sourceDebounceRef.current)
		sourceDebounceRef.current = setTimeout(() => {
			setPage(1)
			fetchItems(1)
		}, 300)
		return () => {
			if (sourceDebounceRef.current) clearTimeout(sourceDebounceRef.current)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [source])

	const handleDelete = async (id: string) => {
		if (!confirm('Удалить это задание? Это действие нельзя отменить.')) return
		try {
			const result = await examTasksService.remove(id, false)
			if ('deleted' in result && result.deleted) {
				fetchItems()
			} else if ('needsConfirm' in result && result.needsConfirm) {
				setModalState({ mode: 'draft', variantNames: result.variantNames, taskId: id })
			}
		} catch (err: unknown) {
			const axiosErr = err as { response?: { status?: number; data?: { variants?: string[] } } }
			if (axiosErr.response?.status === 409 && Array.isArray(axiosErr.response?.data?.variants)) {
				setModalState({
					mode: 'blocked',
					variantNames: axiosErr.response.data!.variants!,
					taskId: id,
				})
			} else {
				console.error('Delete failed:', err)
			}
		}
	}

	const handleConfirmDraftDelete = async () => {
		if (!modalState) return
		try {
			await examTasksService.remove(modalState.taskId, true)
			setModalState(null)
			fetchItems()
		} catch (err) {
			console.error('Force delete failed:', err)
		}
	}

	const isFiltered = Boolean(section || format || source)

	return (
		<div className={styles.page}>
			<div className={styles.header}>
				<h1 className={styles.title}>Банк заданий</h1>
				<Link href="/admin/task-bank/new" className={styles.btn_create}>
					+ Создать задание
				</Link>
			</div>

			<div className={styles.filters}>
				<select
					className={styles.select}
					value={section}
					onChange={(e) => {
						setSection(e.target.value as ExamSection | '')
						setPage(1)
					}}
				>
					<option value="">Все разделы</option>
					<option value="LISTENING">Аудирование</option>
					<option value="READING">Чтение</option>
					<option value="GRAMMAR">Грамматика</option>
					<option value="WRITING">Письмо</option>
					<option value="SPEAKING">Говорение</option>
				</select>

				<select
					className={styles.select}
					value={format}
					onChange={(e) => {
						setFormat(e.target.value as TaskFormat | '')
						setPage(1)
					}}
				>
					<option value="">Все форматы</option>
					<option value="MCQ">MCQ</option>
					<option value="MATCHING">Matching</option>
					<option value="TRUE_FALSE">True / False</option>
					<option value="OPEN_CLOZE">Open Cloze</option>
					<option value="WORD_FORMATION">Word Formation</option>
					<option value="AI_CHECK">AI Проверка</option>
				</select>

				<input
					className={styles.input}
					type="text"
					placeholder="Источник (напр. ФИПИ 2024)"
					value={source}
					onChange={(e) => setSource(e.target.value)}
				/>
			</div>

			<table className={styles.table} style={{ opacity: loading ? 0.6 : 1 }}>
				<thead>
					<tr>
						<th>Название</th>
						<th>Раздел</th>
						<th>Формат</th>
						<th>Источник</th>
						<th>Создан</th>
						<th>Действия</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr key={item.id}>
							<td>
								<Link href={`/admin/task-bank/${item.id}`} className={styles.titleLink}>
									{item.title}
								</Link>
							</td>
							<td>
								<span className={styles.sectionChip}>{SECTION_LABELS[item.section]}</span>
							</td>
							<td>
								<span className={`${styles.formatBadge} ${styles[`format_${item.format}`]}`}>
									{FORMAT_LABELS[item.format]}
								</span>
							</td>
							<td>{item.source ?? '—'}</td>
							<td>{formatDate(item.createdAt)}</td>
							<td className={styles.actions}>
								<Link href={`/admin/task-bank/${item.id}`} className={styles.btn_edit}>
									Изменить
								</Link>
								<button className={styles.btn_delete} onClick={() => handleDelete(item.id)}>
									Удалить
								</button>
							</td>
						</tr>
					))}
					{items.length === 0 && (
						<tr>
							<td colSpan={6} className={styles.empty}>
								{!isFiltered && total === 0 ? (
									<>
										<div className={styles.emptyTitle}>В банке ещё нет заданий</div>
										<div className={styles.emptySub}>
											Создайте первое задание, чтобы начать составлять варианты
										</div>
									</>
								) : (
									<>
										<div className={styles.emptyTitle}>Ничего не найдено</div>
										<div className={styles.emptySub}>Попробуйте изменить фильтры</div>
									</>
								)}
							</td>
						</tr>
					)}
				</tbody>
			</table>

			{totalPages > 1 && (
				<div className={styles.pagination}>
					<button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
						←
					</button>
					<span>
						Стр. {page} / {totalPages}
					</span>
					<button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
						→
					</button>
				</div>
			)}

			{modalState && (
				<DeleteWarningModal
					mode={modalState.mode}
					variantNames={modalState.variantNames}
					onConfirm={modalState.mode === 'draft' ? handleConfirmDraftDelete : undefined}
					onClose={() => setModalState(null)}
				/>
			)}
		</div>
	)
}
