'use client'

import type { VariantTask } from '@/services/variants.service'
import type { ExamSection } from '@/services/attempts.service'
import { SECTION_LABEL, SECTION_ORDER } from '../constants'
import styles from './NavGrid.module.css'

interface Props {
	tasks: VariantTask[]
	currentTaskId: string
	isAnswered: (taskId: string) => boolean
	skippedSections: ExamSection[]
	onSelectTask: (taskId: string) => void
	onToggleSkip: (section: ExamSection) => void
}

export default function NavGrid({
	tasks,
	currentTaskId,
	isAnswered,
	skippedSections,
	onSelectTask,
	onToggleSkip,
}: Props) {
	const tasksBySection: Partial<Record<ExamSection, Array<{ task: VariantTask; index: number }>>> = {}
	tasks.forEach((task, i) => {
		const sec = task.examTask.section
		if (!tasksBySection[sec]) tasksBySection[sec] = []
		tasksBySection[sec]!.push({ task, index: i + 1 })
	})

	return (
		<>
			{SECTION_ORDER.map((section) => {
				const sectionTasks = tasksBySection[section]
				if (!sectionTasks || sectionTasks.length === 0) return null

				const skipped = skippedSections.includes(section)
				const showSkipBtn = section === 'WRITING' || section === 'SPEAKING'

				return (
					<div className={styles.navSection} key={section}>
						<div className={styles.navSectionHeader}>
							<span className={styles.navSectionLabel}>{SECTION_LABEL[section]}</span>
							{showSkipBtn && (
								<button
									type="button"
									className={skipped ? styles.navSectionSkipBtnActive : styles.navSectionSkipBtn}
									onClick={() => onToggleSkip(section)}
								>
									{skipped ? 'Вернуть раздел' : 'Пропустить раздел'}
								</button>
							)}
						</div>
						<div className={styles.navCells}>
							{sectionTasks.map(({ task, index }) => {
								const isSkipped = skippedSections.includes(section)
								const isCurrent = task.examTaskId === currentTaskId
								const answered = !isSkipped && isAnswered(task.examTaskId)
								const cellClasses = [
									styles.navCell,
									answered && !isCurrent && styles.navCellAnswered,
									isCurrent && styles.navCellCurrent,
									isSkipped && styles.navCellSkipped,
								].filter(Boolean).join(' ')

								return (
									<button
										key={task.examTaskId}
										type="button"
										className={cellClasses}
										onClick={() => onSelectTask(task.examTaskId)}
										disabled={isSkipped}
										aria-disabled={isSkipped}
										aria-current={isCurrent ? 'true' : undefined}
									>
										{index}
									</button>
								)
							})}
						</div>
					</div>
				)
			})}
		</>
	)
}
