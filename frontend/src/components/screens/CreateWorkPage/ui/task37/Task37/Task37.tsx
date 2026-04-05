'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import AverageMark from '@/components/ui/AverageMark/AverageMark'
import Criteria from '@/components/ui/Criteria/Criteria'
import Input from '@/components/ui/Input/Input'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import TextArea from '@/components/ui/TextArea/TextArea'
import { useAuth } from '@/hooks/useAuth'
import { Task37Result, useTaskCheck } from '@/config/context/TaskCheckContext'
import api from '@/shared/utils/api'
import cn from 'classnames'
import { FC, useEffect, useState } from 'react'
import CheckingLoader from '../../CheckingLoader/CheckingLoader'
import ReservedField from '../ui/ReservedField/ReservedField'
import styles from './Task37.module.css'

interface Props {
	onChecked?: () => void
	onReset?: () => void
}

const Task37: FC<Props> = ({ onChecked, onReset }) => {
	const { refreshUser } = useAuth()
	const { isChecking, isChecked, taskType, formData, result, error: ctxError, startCheck, completeCheck, failCheck } = useTaskCheck()

	const isThisTask = taskType === '37' || taskType === null

	// Restore form data from context if this task was in progress
	const savedForm = (isThisTask && formData?.kind === 'task37') ? formData : null

	const [subject, setSubject] = useState(savedForm?.subject ?? '')
	const [emailText, setEmailText] = useState(savedForm?.emailText ?? '')
	const [inlineInput, setInlineInput] = useState(savedForm?.inlineInput ?? '')
	const [studentWork, setStudentWork] = useState(savedForm?.studentWork ?? '')

	const [errors, setErrors] = useState({ subject: false, emailText: false, inlineInput: false, studentWork: false })

	// Restore onChecked callback if we come back to a completed check
	useEffect(() => {
		if (isThisTask && isChecked && result?.kind === 'task37') {
			onChecked?.()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const ctxResult = (isThisTask && result?.kind === 'task37') ? result as Task37Result : null
	const checkError = (isThisTask ? ctxError : '') || ''
	const taskIsChecking = isThisTask && isChecking
	const taskIsChecked = isThisTask && isChecked && !!ctxResult

	const handleCheck = async () => {
		const hasErrors = !subject.trim() || !emailText.trim() || !inlineInput.trim() || !studentWork.trim()
		if (hasErrors) {
			setErrors({
				subject: !subject.trim(),
				emailText: !emailText.trim(),
				inlineInput: !inlineInput.trim(),
				studentWork: !studentWork.trim(),
			})
			return
		}

		startCheck('37', { kind: 'task37', subject, emailText, inlineInput, studentWork })

		try {
			const taskDescription = [
				`Subject: ${subject}`,
				emailText,
				`Write about: ${inlineInput}`,
			].join('\n\n')

			const response = await api.post('/tasks/37', {
				taskDescription,
				solution: studentWork,
			})

			const task = response.data?.data?.task
			if (task) {
				completeCheck({
					kind: 'task37',
					k1: task.k1 ?? 0,
					k2: task.k2 ?? 0,
					k3: task.k3 ?? 0,
					totalScore: task.totalScore ?? 0,
					feedback: task.feedback ?? { k1: '', k2: '', k3: '' },
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
		<div className={styles['task37']}>
			<div className={styles['task37__task-fields']}>
				<div className={styles['task37__reserved-fields']}>
					<ReservedField text='From: Friend@mail.uk' />
					<ReservedField text='To: Russian_friend@ege.ru' />
				</div>
				<Input
					placeholder='Введите тему'
					text='Subject:'
					className={cn(styles['task37__input'], {
						[styles['task37__input_error']]: errors.subject,
					})}
					value={subject}
					onChange={e => { setErrors(prev => ({ ...prev, subject: false })); setSubject(e.target.value) }}
					disabled={taskIsChecked || taskIsChecking}
				/>
				<TextArea
					placeholder='Введите текст письма'
					className={cn(styles['task37__textarea'], {
						[styles['task37__textarea_error']]: errors.emailText,
					})}
					value={emailText}
					onChange={value => { setErrors(prev => ({ ...prev, emailText: false })); setEmailText(value) }}
					readOnly={taskIsChecked || taskIsChecking}
				/>
				<div className={styles['task37__instructions']}>
					<p className={styles['task37__instruction-text']}>
						Write an email to Bill. In your message answer his questions, ask 3
						questions about{' '}
						<input
							type='text'
							className={cn(styles['task37__inline-input'], {
								[styles['task37__inline-input_error']]: errors.inlineInput,
							})}
							value={inlineInput}
							onChange={e => { setErrors(prev => ({ ...prev, inlineInput: false })); setInlineInput(e.target.value) }}
							placeholder='введите текст'
							disabled={taskIsChecked || taskIsChecking}
						/>
						. Write 100−140 words. Remember the rules of email writing.
					</p>
				</div>
			</div>

			<div className={styles['task37__task-fields']}>
				<SecondTitle text='Работа ученика' />
				<TextArea
					className={cn(styles['task37__textarea'], {
						[styles['task37__textarea_error']]: errors.studentWork,
						[styles['task37__textarea_active']]: taskIsChecked || taskIsChecking,
					})}
					value={studentWork}
					onChange={value => { setErrors(prev => ({ ...prev, studentWork: false })); setStudentWork(value) }}
					placeholder='Введите текст работы'
					readOnly={taskIsChecked || taskIsChecking}
				/>
			</div>

			{checkError && (
				<p style={{ color: 'red', margin: '8px 0' }}>{checkError}</p>
			)}

			{taskIsChecking && (
				<CheckingLoader criteriaCount={3} stepDuration={9000} />
			)}

			{taskIsChecked && ctxResult && (
				<>
					<div className={styles['task37__results-section']}>
						<SecondTitle text='Оценки' />
						<div className={styles['task37__marks']}>
							<Criteria maxMark={2} criteriaNumber='К1' criteriaDescription='Решение коммуникативной задачи' value={ctxResult.k1} readonly />
							<Criteria maxMark={2} criteriaNumber='К2' criteriaDescription='Организация текста' value={ctxResult.k2} readonly />
							<Criteria maxMark={2} criteriaNumber='К3' criteriaDescription='Языковое оформление текста' value={ctxResult.k3} readonly />
							<AverageMark num={total} />
						</div>
					</div>

					{ctxResult.feedback && (
						<div className={styles['task37__feedback']}>
							<SecondTitle text='Обратная связь' />
							{(['k1', 'k2', 'k3'] as const).map(key =>
								ctxResult.feedback[key] ? (
									<div key={key} className={styles['task37__feedback-item']}>
										<p className={styles['task37__feedback-label']}>{key.toUpperCase()}</p>
										<p className={styles['task37__feedback-text']}>{ctxResult.feedback[key].replace(/\*/g, '')}</p>
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

export default Task37
