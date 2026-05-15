'use client'

import { useState, useMemo } from 'react'
import type { AttemptWithAnswers, SaveState, ExamSection } from '@/services/attempts.service'
import type { VariantListItem } from '@/services/variants.service'
import SaveIndicator from './SaveIndicator/SaveIndicator'
import NavGrid from './NavGrid/NavGrid'
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

	const isAnswered = (taskId: string): boolean => {
		const v = answers[taskId]?.content
		if (v === null || v === undefined) return false
		if (typeof v === 'string') return v.trim().length > 0
		if (Array.isArray(v)) return v.length > 0
		if (typeof v === 'object') return Object.keys(v as object).length > 0
		return true
	}

	return (
		<div className={styles.examPlayer}>
			<aside className={styles.sidebar}>
				<div className={sidebarStyles.saveIndicator}>
					<SaveIndicator state={saveState} onRetry={() => { void setSaveState('error') }} />
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
					{/* Plans 06 + 07 render TaskView, AnswerInput, AudioPlayer, modals here */}
					<p style={{ color: '#6b7280' }}>Current task: {currentTaskId} (контент задания добавит Plan 06)</p>
					<input
						type="hidden"
						data-staterefs={typeof setAnswers === 'function' && typeof setSkippedSections === 'function' ? '1' : '0'}
					/>
				</div>
			</main>
		</div>
	)
}
