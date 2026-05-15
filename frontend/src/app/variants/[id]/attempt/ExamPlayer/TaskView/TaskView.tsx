'use client'

import type { VariantTask } from '@/services/variants.service'
import type { SaveState } from '@/services/attempts.service'
import AnswerInput from '../AnswerInput/AnswerInput'
import AudioPlayer from '../AudioPlayer/AudioPlayer'
import styles from './TaskContent.module.css'

interface Props {
	task: VariantTask
	taskIndex: number
	answer: unknown | null
	saveState: SaveState
	playCount: number
	onAnswerChange: (content: unknown) => void
	onPlay: () => void
	onPrev?: () => void
	onNext: () => void
	isFirst: boolean
	isLast: boolean
	isSkipped: boolean
}

export default function TaskView({
	task,
	taskIndex,
	answer,
	playCount,
	onAnswerChange,
	onPlay,
	onPrev,
	onNext,
	isFirst,
	isLast,
	isSkipped,
}: Props) {
	return (
		<div>
			<div className={styles.taskHeader}>
				<span className={styles.taskNumber}>Задание {taskIndex}</span>
				<h2 className={styles.taskTitle}>{task.examTask.title}</h2>
			</div>

			{task.examTask.body && (
				<p className={styles.taskDescription}>{task.examTask.body}</p>
			)}

			<div className={styles.taskAnswerArea}>
				{task.examTask.audioUrl && (
					<AudioPlayer
						audioUrl={task.examTask.audioUrl}
						playCount={playCount}
						onPlay={onPlay}
						disabled={isSkipped}
					/>
				)}
				<AnswerInput
					task={task.examTask}
					value={answer}
					onChange={onAnswerChange}
					disabled={isSkipped}
				/>
				{isSkipped && (
					<p style={{ color: '#6b7280', fontSize: 12 }}>
						Раздел пропущен — ответ не будет отправлен на проверку
					</p>
				)}
			</div>

			<div className={styles.prevNextRow}>
				{!isFirst ? (
					<button type="button" className={styles.btn_prev} onClick={onPrev}>
						← Назад
					</button>
				) : (
					<span />
				)}
				<button type="button" className={styles.btn_next} onClick={onNext}>
					{isLast
						? 'Завершить →'
						: 'Далее →'}
				</button>
			</div>
		</div>
	)
}
