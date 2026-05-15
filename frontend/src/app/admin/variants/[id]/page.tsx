'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import variantsService, { VariantListItem, VariantTask } from '@/services/variants.service'
import examTasksService, { ExamTaskListItem, ExamSection, TaskFormat } from '@/services/exam-tasks.service'
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from '@dnd-kit/core'
import {
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	arrayMove,
	verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import styles from './VariantBuilder.module.css'

// ---- Constants ----

const SECTION_BADGE_CLASS: Record<ExamSection, string> = {
	LISTENING: styles.sectionBadge_LISTENING,
	READING:   styles.sectionBadge_READING,
	GRAMMAR:   styles.sectionBadge_GRAMMAR,
	WRITING:   styles.sectionBadge_WRITING,
	SPEAKING:  styles.sectionBadge_SPEAKING,
}

const SECTION_SHORT: Record<ExamSection, string> = {
	LISTENING: 'LISTEN',
	READING:   'READ',
	GRAMMAR:   'GRAM',
	WRITING:   'WRITE',
	SPEAKING:  'SPEAK',
}

const SECTION_FILTER_OPTIONS: { value: ExamSection | ''; label: string }[] = [
	{ value: '',          label: 'Все разделы' },
	{ value: 'LISTENING', label: 'Аудирование' },
	{ value: 'READING',   label: 'Чтение' },
	{ value: 'GRAMMAR',   label: 'Грамматика' },
	{ value: 'WRITING',   label: 'Письмо' },
	{ value: 'SPEAKING',  label: 'Говорение' },
]

const FORMAT_OPTIONS: { value: TaskFormat | ''; label: string }[] = [
	{ value: '',               label: 'Все форматы' },
	{ value: 'MCQ',            label: 'MCQ' },
	{ value: 'MATCHING',       label: 'Matching' },
	{ value: 'TRUE_FALSE',     label: 'True/False' },
	{ value: 'OPEN_CLOZE',     label: 'Open Cloze' },
	{ value: 'WORD_FORMATION', label: 'Word Formation' },
	{ value: 'AI_CHECK',       label: 'AI Check' },
]

// ---- Types ----

type LocalRow = {
	rowKey: string       // stable key for dnd-kit + React: VariantTask.id for existing, 'new:' + examTaskId for newly added
	examTaskId: string
	title: string
	section: ExamSection
	format: TaskFormat
}

// ---- SortableTaskRow sub-component ----

interface SortableTaskRowProps {
	row: LocalRow
	onRemove: (rowKey: string) => void
}

function SortableTaskRow({ row, onRemove }: SortableTaskRowProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: row.rowKey })

	return (
		<div
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={`${styles.taskRow}${isDragging ? ' ' + styles.taskRow_dragging : ''}`}
		>
			<span
				{...listeners}
				{...attributes}
				className={styles.dragHandle}
				aria-label="Перетащить"
			>
				⠿
			</span>
			<span className={`${styles.sectionBadge} ${SECTION_BADGE_CLASS[row.section]}`}>
				{SECTION_SHORT[row.section]}
			</span>
			<span className={styles.taskTitle} title={row.title}>{row.title}</span>
			<button
				className={styles.removeBtn}
				onClick={() => onRemove(row.rowKey)}
				aria-label="Удалить задание"
			>
				✕
			</button>
		</div>
	)
}

// ---- VariantBuilderPage ----

export default function VariantBuilderPage() {
	const { id } = useParams<{ id: string }>()

	// Variant data
	const [variant, setVariant] = useState<VariantListItem | null>(null)
	const [notFound, setNotFound] = useState(false)

	// Right panel
	const [rightPanelRows, setRightPanelRows] = useState<LocalRow[]>([])
	const [lastSavedExamTaskIds, setLastSavedExamTaskIds] = useState<string[]>([])

	// Meta form
	const [metaForm, setMetaForm] = useState<{ title: string; description: string }>({ title: '', description: '' })
	const [published, setPublished] = useState(false)

	// Bank (left panel)
	const [bankItems, setBankItems] = useState<ExamTaskListItem[]>([])
	const [bankPage, setBankPage] = useState(1)
	const [bankTotalPages, setBankTotalPages] = useState(1)
	const [bankLoading, setBankLoading] = useState(false)
	const [sectionFilter, setSectionFilter] = useState<ExamSection | ''>('')
	const [formatFilter, setFormatFilter] = useState<TaskFormat | ''>('')
	const [sourceFilter, setSourceFilter] = useState('')

	// Save state
	const [saving, setSaving] = useState(false)
	const [saveSuccess, setSaveSuccess] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)

	// Meta save state
	const [metaSaving, setMetaSaving] = useState(false)
	const [metaError, setMetaError] = useState<string | null>(null)

	// Derived: set of already-added examTaskIds (works across left panel pages — Pitfall 3)
	const addedExamTaskIds = useMemo(
		() => new Set(rightPanelRows.map(r => r.examTaskId)),
		[rightPanelRows],
	)

	// Derived: dirty flag — compare current right panel order vs last saved order
	const isDirty = useMemo(
		() => JSON.stringify(rightPanelRows.map(r => r.examTaskId)) !== JSON.stringify(lastSavedExamTaskIds),
		[rightPanelRows, lastSavedExamTaskIds],
	)

	// Sensors
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	)

	// Effect 1: initial variant load
	useEffect(() => {
		variantsService.adminGetById(id)
			.then((v) => {
				setVariant(v)
				setMetaForm({ title: v.title, description: v.description ?? '' })
				setPublished(v.published)
				const rows: LocalRow[] = v.variantTasks.map((vt: VariantTask) => ({
					rowKey: vt.id,
					examTaskId: vt.examTaskId,
					title: vt.examTask.title,
					section: vt.examTask.section,
					format: vt.examTask.format,
				}))
				setRightPanelRows(rows)
				setLastSavedExamTaskIds(rows.map(r => r.examTaskId))
			})
			.catch(() => setNotFound(true))
	}, [id])

	// Effect 2: bank fetch on filter/page change
	useEffect(() => {
		let cancelled = false
		const t = setTimeout(async () => {
			setBankLoading(true)
			try {
				const result = await examTasksService.list({
					page: bankPage,
					limit: 20,
					section: sectionFilter || undefined,
					format: formatFilter || undefined,
					source: sourceFilter || undefined,
				})
				if (!cancelled) {
					setBankItems(result.items)
					setBankTotalPages(result.totalPages)
				}
			} catch {
				if (!cancelled) setBankItems([])
			} finally {
				if (!cancelled) setBankLoading(false)
			}
		}, sourceFilter ? 300 : 0)
		return () => {
			cancelled = true
			clearTimeout(t)
		}
	}, [bankPage, sectionFilter, formatFilter, sourceFilter])

	// ---- Handlers ----

	function handleAddTask(item: ExamTaskListItem) {
		if (addedExamTaskIds.has(item.id)) return
		setRightPanelRows(rows => [
			...rows,
			{
				rowKey: 'new:' + item.id,
				examTaskId: item.id,
				title: item.title,
				section: item.section,
				format: item.format,
			},
		])
	}

	function handleRemoveRow(rowKey: string) {
		setRightPanelRows(rows => rows.filter(r => r.rowKey !== rowKey))
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over } = event
		if (over && active.id !== over.id) {
			setRightPanelRows(rows => {
				const oldIndex = rows.findIndex(r => r.rowKey === active.id)
				const newIndex = rows.findIndex(r => r.rowKey === over.id)
				return arrayMove(rows, oldIndex, newIndex)
			})
		}
	}

	async function handleSave() {
		setSaving(true)
		setSaveError(null)
		try {
			const examTaskIds = rightPanelRows.map(r => r.examTaskId)
			const updated = await variantsService.adminAssignTasks(id, examTaskIds)
			setVariant(updated)
			const newRows: LocalRow[] = updated.variantTasks.map((vt: VariantTask) => ({
				rowKey: vt.id,
				examTaskId: vt.examTaskId,
				title: vt.examTask.title,
				section: vt.examTask.section,
				format: vt.examTask.format,
			}))
			setRightPanelRows(newRows)
			setLastSavedExamTaskIds(newRows.map(r => r.examTaskId))
			setSaveSuccess(true)
			setTimeout(() => setSaveSuccess(false), 2000)
		} catch (err: unknown) {
			const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
			setSaveError(message || 'Не удалось сохранить. Попробуйте ещё раз.')
		} finally {
			setSaving(false)
		}
	}

	async function handleMetaSave() {
		if (
			metaForm.title === variant?.title &&
			(metaForm.description || '') === (variant?.description || '')
		) {
			return
		}
		setMetaSaving(true)
		setMetaError(null)
		try {
			const updated = await variantsService.adminUpdate(id, {
				title: metaForm.title.trim(),
				description: metaForm.description.trim() || undefined,
			})
			setVariant(updated)
		} catch {
			setMetaError('Не удалось сохранить название/описание.')
		} finally {
			setMetaSaving(false)
		}
	}

	async function handleTogglePublish() {
		const prev = published
		setPublished(!prev)
		try {
			await variantsService.adminUpdate(id, { published: !prev })
		} catch {
			setPublished(prev)
			setMetaError('Ошибка при публикации — попробуйте снова')
			setTimeout(() => setMetaError(null), 3000)
		}
	}

	// ---- Guards ----

	if (notFound) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 40 }}>
				<p style={{ color: '#6b7280', fontSize: 14 }}>Вариант не найден</p>
				<Link href="/admin/variants" className={styles.back}>← Варианты</Link>
			</div>
		)
	}

	if (variant === null) {
		return <div style={{ padding: 40, color: '#6b7280', fontSize: 14 }}>Загрузка...</div>
	}

	// ---- Render ----

	return (
		<div>
			{/* Back link */}
			<Link href="/admin/variants" className={styles.back}>← Варианты</Link>

			{/* Meta row: title + description + publish toggle */}
			<div className={styles.metaRow}>
				<input
					className={styles.metaTitleInput}
					type="text"
					value={metaForm.title}
					onChange={e => setMetaForm(f => ({ ...f, title: e.target.value }))}
					onBlur={handleMetaSave}
					placeholder="Без названия"
				/>
				<textarea
					className={styles.metaDescInput}
					value={metaForm.description}
					onChange={e => setMetaForm(f => ({ ...f, description: e.target.value }))}
					onBlur={handleMetaSave}
					placeholder="Описание (необязательно)"
				/>
				<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
					<button
						className={`${styles.btn_publish} ${published ? styles.btn_publish_on : styles.btn_publish_off}`}
						onClick={handleTogglePublish}
					>
						{published ? 'Снять с публикации' : 'Опубликовать'}
					</button>
					{metaSaving && <span className={styles.spinner} />}
				</div>
				{metaError && <div className={styles.error}>{metaError}</div>}
			</div>

			{/* Save bar (sticky) */}
			<div className={styles.saveBar}>
				<button
					className={isDirty ? `${styles.btn_save} ${styles.btn_save_dirty}` : styles.btn_save}
					disabled={saving || !isDirty}
					onClick={handleSave}
				>
					{saving ? <span className={styles.spinner} /> : 'Сохранить'}
				</button>
				{saveSuccess && <span className={styles.saveSuccess}>Сохранено ✓</span>}
				{saveError && <span className={styles.error}>{saveError}</span>}
			</div>

			{/* Split-pane layout */}
			<div className={styles.builderLayout}>

				{/* Left panel: task bank */}
				<div className={styles.leftPanel}>
					<div className={styles.panelHeader}>
						<span className={styles.panelTitle}>Банк заданий</span>
						<span className={styles.panelCount}>{bankItems.length}</span>
					</div>

					{/* Filters */}
					<div className={styles.filters}>
						<select
							className={styles.filterSelect}
							value={sectionFilter}
							onChange={e => { setSectionFilter(e.target.value as ExamSection | ''); setBankPage(1) }}
						>
							{SECTION_FILTER_OPTIONS.map(o => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
						<select
							className={styles.filterSelect}
							value={formatFilter}
							onChange={e => { setFormatFilter(e.target.value as TaskFormat | ''); setBankPage(1) }}
						>
							{FORMAT_OPTIONS.map(o => (
								<option key={o.value} value={o.value}>{o.label}</option>
							))}
						</select>
						<input
							className={styles.filterInput}
							placeholder="Источник"
							value={sourceFilter}
							onChange={e => { setSourceFilter(e.target.value); setBankPage(1) }}
						/>
					</div>

					{/* Bank list */}
					<div className={styles.bankList}>
						{bankLoading ? (
							<>
								<div className={styles.skeletonRow} />
								<div className={styles.skeletonRow} />
								<div className={styles.skeletonRow} />
							</>
						) : (
							bankItems.map(item => (
								<div
									key={item.id}
									className={`${styles.bankRow}${addedExamTaskIds.has(item.id) ? ' ' + styles.bankRow_muted + ' ' + styles.taskRow_muted : ''}`}
								>
									<span className={`${styles.sectionBadge} ${SECTION_BADGE_CLASS[item.section]}`}>
										{SECTION_SHORT[item.section]}
									</span>
									<span className={styles.taskTitle} title={item.title}>{item.title}</span>
									<button
										className={styles.addBtn}
										onClick={() => handleAddTask(item)}
										disabled={addedExamTaskIds.has(item.id)}
									>
										+ Добавить
									</button>
								</div>
							))
						)}
					</div>

					{/* Pagination */}
					{bankTotalPages > 1 && (
						<div className={styles.pagination}>
							<button
								disabled={bankPage === 1}
								onClick={() => setBankPage(p => p - 1)}
							>
								←
							</button>
							<span className={styles.paginationText}>Стр. {bankPage} / {bankTotalPages}</span>
							<button
								disabled={bankPage === bankTotalPages}
								onClick={() => setBankPage(p => p + 1)}
							>
								→
							</button>
						</div>
					)}
				</div>

				{/* Right panel: variant tasks (sortable) */}
				<div className={styles.rightPanel}>
					<div className={styles.panelHeader}>
						<span className={styles.panelTitle}>Задания варианта ({rightPanelRows.length})</span>
					</div>

					{rightPanelRows.length === 0 ? (
						<div className={styles.emptyRight}>Добавьте задания из банка слева</div>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={rightPanelRows.map(r => r.rowKey)}
								strategy={verticalListSortingStrategy}
							>
								{rightPanelRows.map(row => (
									<SortableTaskRow
										key={row.rowKey}
										row={row}
										onRemove={handleRemoveRow}
									/>
								))}
							</SortableContext>
						</DndContext>
					)}
				</div>
			</div>
		</div>
	)
}
