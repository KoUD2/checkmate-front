'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import AverageMark from '@/components/ui/AverageMark/AverageMark'
import Criteria from '@/components/ui/Criteria/Criteria'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import TextArea from '@/components/ui/TextArea/TextArea'
import { useAuth } from '@/hooks/useAuth'
import { Task38Result, useTaskCheck } from '@/config/context/TaskCheckContext'
import api from '@/shared/utils/api'
import cn from 'classnames'
import { ChangeEvent, FC, useEffect, useRef, useState } from 'react'
import CheckingLoader from '../../CheckingLoader/CheckingLoader'
import styles from './Task38.module.css'

interface Props {
	onChecked?: () => void
	onReset?: () => void
}

const Task38: FC<Props> = ({ onChecked }) => {
	const { refreshUser } = useAuth()
	const { isChecking, isChecked, taskType, formData, result, error: ctxError, startCheck, completeCheck, failCheck } = useTaskCheck()

	const isThisTask = taskType === '38.1' || taskType === '38.2' || taskType === null

	const savedForm = (isThisTask && formData?.kind === 'task38') ? formData : null

	const [topic, setTopic] = useState(savedForm?.topic ?? '')
	const [problemFill, setProblemFill] = useState(savedForm?.problemFill ?? '')
	const [opinionFill, setOpinionFill] = useState(savedForm?.opinionFill ?? '')
	const [studentWork, setStudentWork] = useState(savedForm?.studentWork ?? '')
	const [imageBase64, setImageBase64] = useState<string | undefined>(savedForm?.imageBase64)
	const [imageFileName, setImageFileName] = useState(savedForm?.imageFileName ?? '')
	const fileInputRef = useRef<HTMLInputElement>(null)

	const [errors, setErrors] = useState({ topic: false, studentWork: false })

	useEffect(() => {
		if (isThisTask && isChecked && result?.kind === 'task38') {
			onChecked?.()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const ctxResult = (isThisTask && result?.kind === 'task38') ? result as Task38Result : null
	const checkError = (isThisTask ? ctxError : '') || ''
	const taskIsChecking = isThisTask && isChecking
	const taskIsChecked = isThisTask && isChecked && !!ctxResult

	const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setImageFileName(file.name)
		const reader = new FileReader()
		reader.onload = () => {
			const base64 = (reader.result as string).split(',')[1]
			setImageBase64(base64)
		}
		reader.readAsDataURL(file)
	}

	const handleCheck = async () => {
		const hasErrors = !topic.trim() || !studentWork.trim()
		if (hasErrors) {
			setErrors({ topic: !topic.trim(), studentWork: !studentWork.trim() })
			return
		}

		startCheck(taskType ?? '38.1', {
			kind: 'task38',
			topic,
			problemFill,
			opinionFill,
			studentWork,
			imageBase64,
			imageFileName,
		})

		try {
			const taskDescription = [
				`Topic: ${topic}`,
				problemFill ? `Problem context: ${problemFill}` : '',
				opinionFill ? `Opinion context: ${opinionFill}` : '',
			]
				.filter(Boolean)
				.join('\n')

			const response = await api.post('/tasks/38', {
				taskDescription,
				solution: studentWork,
				...(imageBase64 ? { imageBase64 } : {}),
			})

			const task = response.data?.data?.task
			if (task) {
				completeCheck({
					kind: 'task38',
					k1: task.k1 ?? 0,
					k2: task.k2 ?? 0,
					k3: task.k3 ?? 0,
					k4: task.k4 ?? 0,
					k5: task.k5 ?? 0,
					totalScore: task.totalScore ?? 0,
					feedback: task.feedback ?? { k1: '', k2: '', k3: '', k4: '', k5: '' },
				})
				onChecked?.()
				refreshUser()
			}
		} catch (err: unknown) {
			const message =
				(err as { response?: { data?: { error?: { message?: string } } } })
					?.response?.data?.error?.message || 'Ошибка при проверке'
			failCheck(message)
		}
	}

	const total = ctxResult?.totalScore ?? 0

	return (
		<div className={styles['task38']}>
			<div className={styles['task38__instructions']}>
				<p className={styles['task38__instruction-text']}>
					Imagine that you are doing a project on{' '}
					<input
						type='text'
						className={cn(styles['task38__inline-input'], {
							[styles['task38__inline-input_error']]: errors.topic,
						})}
						placeholder='введите тему'
						value={topic}
						onChange={e => {
							setErrors(prev => ({ ...prev, topic: false }))
							setTopic(e.target.value)
						}}
						disabled={taskIsChecked || taskIsChecking}
					/>
					. You have found some data on the subject — the results of the opinion
					polls (see the table below).
					<br />
					<br />
					Comment on the data in the table and give your opinion on the subject
					of the project.
				</p>
			</div>

			<div className={styles['task38__file-section']}>
				<input
					ref={fileInputRef}
					type='file'
					accept='image/*'
					style={{ display: 'none' }}
					onChange={handleFileChange}
					disabled={taskIsChecked || taskIsChecking}
				/>
				<button
					type='button'
					className={styles['task38__file-button']}
					onClick={() => fileInputRef.current?.click()}
					disabled={taskIsChecked || taskIsChecking}
				>
					{imageFileName || 'Загрузить изображение (график)'}
				</button>
			</div>

			<div className={styles['task38__plan']}>
				<p className={styles['task38__plan-text']}>
					Write{' '}
					<span className={styles['task38__plan-text_isBold']}>
						200-250 words
					</span>
					.
					<br />
					Use the following plan:
				</p>
				<ul className={styles['task38__plan-list']}>
					<li className={styles['task38__plan-item']}>
						make an opening statement on the subject of the project;
					</li>
					<li className={styles['task38__plan-item']}>
						select and report 2-3 facts;
					</li>
					<li className={styles['task38__plan-item']}>
						make 1-2 comparisons where relevant and give your comments;
					</li>
					<li className={styles['task38__plan-item']}>
						outline a problem that{' '}
						<input
							type='text'
							className={styles['task38__inline-input']}
							placeholder='введите текст'
							value={problemFill}
							onChange={e => setProblemFill(e.target.value)}
							disabled={taskIsChecked || taskIsChecking}
						/>{' '}
						and suggest a way of solving it;
					</li>
					<li className={styles['task38__plan-item']}>
						conclude by giving and explaining your opinion on{' '}
						<input
							type='text'
							className={styles['task38__inline-input']}
							placeholder='введите текст'
							value={opinionFill}
							onChange={e => setOpinionFill(e.target.value)}
							disabled={taskIsChecked || taskIsChecking}
						/>
						.
					</li>
				</ul>
			</div>

			<div className={styles['task38__task-fields']}>
				<SecondTitle text='Работа ученика' />
				<TextArea
					placeholder='Введите текст работы'
					className={cn(styles['task38__textarea'], {
						[styles['task38__textarea_error']]: errors.studentWork,
						[styles['task38__textarea_active']]: taskIsChecked || taskIsChecking,
					})}
					value={studentWork}
					onChange={value => {
						setErrors(prev => ({ ...prev, studentWork: false }))
						setStudentWork(value)
					}}
					readOnly={taskIsChecked || taskIsChecking}
				/>
			</div>

			{checkError && (
				<p style={{ color: 'red', margin: '8px 0' }}>{checkError}</p>
			)}

			{taskIsChecking && (
				<CheckingLoader criteriaCount={5} stepDuration={9000} />
			)}

			{taskIsChecked && ctxResult && (
				<>
					<div className={styles['task38__results-section']}>
						<SecondTitle text='Оценки' />
						<div className={styles['task38__marks']}>
							<Criteria maxMark={3} criteriaNumber='К1' criteriaDescription='Решение коммуникативной задачи' value={ctxResult.k1} readonly />
							<Criteria maxMark={3} criteriaNumber='К2' criteriaDescription='Организация текста' value={ctxResult.k2} readonly />
							<Criteria maxMark={3} criteriaNumber='К3' criteriaDescription='Лексика' value={ctxResult.k3} readonly />
							<Criteria maxMark={3} criteriaNumber='К4' criteriaDescription='Грамматика' value={ctxResult.k4} readonly />
							<Criteria maxMark={3} criteriaNumber='К5' criteriaDescription='Орфография и пунктуация' value={ctxResult.k5} readonly />
							<AverageMark num={total} />
						</div>
					</div>

					{ctxResult.feedback && (
						<div className={styles['task38__feedback']}>
							<SecondTitle text='Обратная связь' />
							{(['k1', 'k2', 'k3', 'k4', 'k5'] as const).map(key =>
								ctxResult.feedback[key] ? (
									<div key={key} className={styles['task38__feedback-item']}>
										<p className={styles['task38__feedback-label']}>{key.toUpperCase()}</p>
										<p className={styles['task38__feedback-text']}>{ctxResult.feedback[key].replace(/\*/g, '')}</p>
									</div>
								) : null
							)}
						</div>
					)}
				</>
			)}

			{!taskIsChecked && (
				<ActiveButton
					text={taskIsChecking ? 'Проверяю...' : 'Проверить'}
					onClick={handleCheck}
					disabled={taskIsChecking}
				/>
			)}
		</div>
	)
}

export default Task38
