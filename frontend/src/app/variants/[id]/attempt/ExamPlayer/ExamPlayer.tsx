'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { AttemptWithAnswers, SaveState, ExamSection } from '@/services/attempts.service'
import type { VariantListItem } from '@/services/variants.service'
import attemptsService from '@/services/attempts.service'
import SaveIndicator from './SaveIndicator/SaveIndicator'
import NavGrid from './NavGrid/NavGrid'
import TaskView from './TaskView/TaskView'
import styles from './ExamPlayer.module.css'
import sidebarStyles from './ExamPlayerSidebar.module.css'

interface Props {
	attempt: AttemptWithAnswers
	variant: VariantListItem
}

export default function ExamPlayer({ attempt, variant }: Props) {
	const tasks = useMemo(
		() => [...(variant.variantTasks ?? [])].sort((a, b) => a.position - b.position),
		[variant.variantTasks],
	)

	const [currentTaskId, setCurrentTaskId] = useState<string>(() => tasks[0]?.examTaskId ?? '')

	const [answers, setAnswers] = useState<Record<string, { content: unknown | null; playCount: number }>>(() => {
		const map: Record<string, { content: unknown | null; playCount: number }> = {}
		for (const a of attempt.answers) {
			map[a.examTaskId] = { content: a.content ?? null, playCount: a.playCount }
		}
		return map
	})

	const [skippedSections, setSkippedSections] = useState<ExamSection[]>(attempt.skippedSections ?? [])

	const [saveState, setSaveState] = useState<SaveState>('idle')

	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const pendingPayloadRef = useRef<{ taskId: string; content: unknown } | null>(null)

	const isAnswered = (taskId: string): boolean => {
		const v = answers[taskId]?.content
		if (v === null || v === undefined) return false
		if (typeof v === 'string') return v.trim().length > 0
		if (Array.isArray(v)) return v.length > 0
		if (typeof v === 'object') return Object.keys(v as object).length > 0
		return true
	}

	const performSave = useCallback(async (taskId: string, content: unknown) => {
		setSaveState('saving')
		pendingPayloadRef.current = { taskId, content }
		try {
			await attemptsService.upsertAnswer(attempt.id, taskId, content)
			setAnswers(prev => ({ ...prev, [taskId]: { content, playCount: prev[taskId]?.playCount ?? 0 } }))
			pendingPayloadRef.current = null
			setSaveState('saved')
		} catch {
			setSaveState('error')
		}
	}, [attempt.id])

	const scheduleAutoSave = useCallback((taskId: string, content: unknown) => {
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
		setSaveState('saving')
		pendingPayloadRef.current = { taskId, content }
		saveTimerRef.current = setTimeout(() => { void performSave(taskId, content) }, 1500)
	}, [performSave])

	const handleRetry = useCallback(() => {
		const p = pendingPayloadRef.current
		if (p) void performSave(p.taskId, p.content)
	}, [performSave])

	const handleIncrementPlay = useCallback(async (taskId: string) => {
		try {
			const { playCount } = await attemptsService.incrementPlay(attempt.id, taskId)
			setAnswers(prev => ({ ...prev, [taskId]: { content: prev[taskId]?.content ?? null, playCount } }))
		} catch {
			// server rejected (e.g. at limit) — do nothing; UI already shows the count
		}
	}, [attempt.id])

	// Clear debounce timer on unmount
	useEffect(() => {
		return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
	}, [])

	// Cancel any pending save when switching tasks — do NOT flush
	useEffect(() => {
		if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null }
		pendingPayloadRef.current = null
		setSaveState('idle')
	}, [currentTaskId])

	const currentTask = tasks.find(t => t.examTaskId === currentTaskId)
	const currentIndex = tasks.findIndex(t => t.examTaskId === currentTaskId) + 1
	const currentAnswerContent = answers[currentTaskId]?.content ?? null
	const currentPlayCount = answers[currentTaskId]?.playCount ?? 0
	const isFirst = currentIndex === 1
	const isLast = currentIndex === tasks.length
	const isSkipped = currentTask ? skippedSections.includes(currentTask.examTask.section) : false

	return (
		<div className={styles.examPlayer}>
			<aside className={styles.sidebar}>
				<div className={sidebarStyles.saveIndicator}>
					<SaveIndicator state={saveState} onRetry={handleRetry} />
				</div>
				<div className={sidebarStyles.navGrid}>
					<NavGrid
						tasks={tasks}
						currentTaskId={currentTaskId}
						isAnswered={isAnswered}
						skippedSections={skippedSections}
						onSelectTask={setCurrentTaskId}
						onToggleSkip={() => { /* Plan 07 wires this */ }}
					/>
				</div>
				<div className={sidebarStyles.sidebarFooter}>
					<button className={sidebarStyles.btn_submit} disabled type="button">Завершить вариант</button>
				</div>
			</aside>
			<main className={styles.mainArea}>
				<div className={styles.mainContent}>
					{currentTask ? (
						<TaskView
							task={currentTask}
							taskIndex={currentIndex}
							answer={currentAnswerContent}
							saveState={saveState}
							playCount={currentPlayCount}
							onAnswerChange={(content) => scheduleAutoSave(currentTaskId, content)}
							onPlay={() => handleIncrementPlay(currentTaskId)}
							onPrev={() => { const prev = tasks[currentIndex - 2]; if (prev) setCurrentTaskId(prev.examTaskId) }}
							onNext={() => {
								// TODO(plan-07): if isLast, open submit modal instead of advancing
								const next = tasks[currentIndex]; if (next) setCurrentTaskId(next.examTaskId)
							}}
							isFirst={isFirst}
							isLast={isLast}
							isSkipped={isSkipped}
						/>
					) : (
						<p>Задание не найдено</p>
					)}
				</div>
			</main>
		</div>
	)
}
