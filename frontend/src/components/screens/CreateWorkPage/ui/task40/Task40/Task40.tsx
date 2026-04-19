'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import AverageMark from '@/components/ui/AverageMark/AverageMark'
import Criteria from '@/components/ui/Criteria/Criteria'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import { useAuth } from '@/hooks/useAuth'
import { Task40Result, useTaskCheck } from '@/config/context/TaskCheckContext'
import api from '@/shared/utils/api'
import cn from 'classnames'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import CheckingLoader from '../../CheckingLoader/CheckingLoader'
import styles from './Task40.module.css'

type Phase = 'input' | 'preparation' | 'recording' | 'done'

const PREP_SECONDS = 90  // 1.5 min preparation
const REC_SECONDS = 80   // 4 × 20 sec

const TASK_INSTRUCTION = 'You are considering using the in home tutoring service and you\'d like to get more information. In 1.5 minutes you are to ask four direct questions to find out the following.'
const TASK_FOOTER = 'You have 20 seconds to ask each question.'

interface Props {
	onChecked?: () => void
	onReset?: () => void
}

const Task40: FC<Props> = ({ onChecked }) => {
	const { refreshUser } = useAuth()
	const { isChecking, isChecked, taskType, result, error: ctxError, startCheck, completeCheck, failCheck } = useTaskCheck()

	const isThisTask = taskType === '40' || taskType === null

	const [phase, setPhase] = useState<Phase>('input')
	const [secondsLeft, setSecondsLeft] = useState(PREP_SECONDS)
	const [mode, setMode] = useState<'record' | 'upload'>('record')
	const [questions, setQuestions] = useState(['', '', '', ''])
	const [questionsError, setQuestionsError] = useState(false)

	// Audio upload
	const [uploadedAudio, setUploadedAudio] = useState<File | null>(null)
	const audioInputRef = useRef<HTMLInputElement>(null)

	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])

	const ctxResult = (isThisTask && result?.kind === 'task40') ? result as Task40Result : null
	const checkError = (isThisTask ? ctxError : '') || ''
	const taskIsChecking = isThisTask && isChecking
	const taskIsChecked = isThisTask && isChecked && !!ctxResult

	useEffect(() => {
		if (isThisTask && isChecked && result?.kind === 'task40') {
			onChecked?.()
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const stopTimer = useCallback(() => {
		if (timerRef.current) {
			clearInterval(timerRef.current)
			timerRef.current = null
		}
	}, [])

	const startCountdown = useCallback((seconds: number, onEnd: () => void) => {
		stopTimer()
		setSecondsLeft(seconds)
		timerRef.current = setInterval(() => {
			setSecondsLeft(prev => {
				if (prev <= 1) {
					stopTimer()
					onEnd()
					return 0
				}
				return prev - 1
			})
		}, 1000)
	}, [stopTimer])

	useEffect(() => () => stopTimer(), [stopTimer])

	const handleStartPreparation = () => {
		if (!questions.every(q => q.trim())) {
			setQuestionsError(true)
			return
		}
		setQuestionsError(false)
		setPhase('preparation')
		startCountdown(PREP_SECONDS, handleStartRecording)
	}

	const handleStartRecording = useCallback(async () => {
		stopTimer()
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
			const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
				? 'audio/webm;codecs=opus'
				: 'audio/mp4'
			const recorder = new MediaRecorder(stream, { mimeType })
			audioChunksRef.current = []
			recorder.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
			recorder.start(1000)
			mediaRecorderRef.current = recorder
			setPhase('recording')
			startCountdown(REC_SECONDS, handleStopRecording)
		} catch {
			failCheck('Не удалось получить доступ к микрофону. Разрешите доступ и попробуйте снова.')
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stopTimer, startCountdown])

	const submitAudio = useCallback(async (audioBase64: string) => {
		startCheck('40', { kind: 'task40' })
		setPhase('done')
		try {
			const response = await api.post('/tasks/40', {
				audioBase64,
				questions,
			})
			const task = response.data?.data?.task
			if (task) {
				completeCheck({
					kind: 'task40',
					k1: task.k1 ?? 0,
					k2: task.k2 ?? 0,
					k3: task.k3 ?? 0,
					k4: task.k4 ?? 0,
					totalScore: task.totalScore ?? 0,
					feedback: task.feedback ?? { k1: '', k2: '', k3: '', k4: '' },
					transcription: task.transcription ?? '',
				})
				onChecked?.()
				refreshUser()
			}
		} catch (err: unknown) {
			const message =
				(err as { response?: { data?: { error?: { message?: string } } } })
					?.response?.data?.error?.message || 'Ошибка при проверке'
			failCheck(message)
			setPhase('input')
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [startCheck, completeCheck, failCheck, onChecked, refreshUser, questions])

	const handleStopRecording = useCallback(() => {
		stopTimer()
		const recorder = mediaRecorderRef.current
		if (!recorder) return

		recorder.onstop = async () => {
			const mimeType = recorder.mimeType || 'audio/webm'
			const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
			recorder.stream.getTracks().forEach(t => t.stop())

			const reader = new FileReader()
			reader.onload = async () => {
				const dataUrl = reader.result as string
				const base64 = dataUrl.split(',')[1]
				await submitAudio(base64)
			}
			reader.readAsDataURL(audioBlob)
		}

		recorder.stop()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stopTimer, submitAudio])

	const handleUploadAndSubmit = () => {
		if (!questions.every(q => q.trim())) {
			setQuestionsError(true)
			return
		}
		if (!uploadedAudio) return
		setQuestionsError(false)

		const reader = new FileReader()
		reader.onload = async () => {
			const base64 = reader.result as string
			await submitAudio(base64)
		}
		reader.readAsDataURL(uploadedAudio)
	}

	const formatTime = (s: number) => {
		const m = Math.floor(s / 60)
		const sec = s % 60
		return `${m}:${sec.toString().padStart(2, '0')}`
	}

	const taskContent = (
		<div className={styles['task40__task-content']}>
			<p className={styles['task40__instruction']}>{TASK_INSTRUCTION}</p>
			<div className={styles['task40__questions']}>
				{questions.map((q, i) => (
					<div key={i} className={styles['task40__question-item']}>
						<span className={styles['task40__question-num']}>{i + 1}</span>
						<span>{q || `Тема вопроса ${i + 1}`}</span>
					</div>
				))}
			</div>
			<p className={styles['task40__footer']}>{TASK_FOOTER}</p>
		</div>
	)

	// Input phase
	if (phase === 'input' && !taskIsChecking && !taskIsChecked) {
		return (
			<div className={styles['task40']}>
				<div className={styles['task40__mode-tabs']}>
					<button
						className={cn(styles['task40__mode-tab'], { [styles['task40__mode-tab_active']]: mode === 'record' })}
						onClick={() => { setMode('record'); setUploadedAudio(null) }}
					>
						Записать
					</button>
					<button
						className={cn(styles['task40__mode-tab'], { [styles['task40__mode-tab_active']]: mode === 'upload' })}
						onClick={() => { setMode('upload'); setUploadedAudio(null) }}
					>
						Загрузить аудио
					</button>
				</div>

				<div className={styles['task40__task-content']}>
					<p className={styles['task40__instruction']}>{TASK_INSTRUCTION}</p>
					<div className={styles['task40__questions-inputs']}>
						{questions.map((q, i) => (
							<input
								key={i}
								className={cn(styles['task40__question-input'], { [styles['task40__question-input_error']]: questionsError && !q.trim() })}
								value={q}
								onChange={e => {
									const next = [...questions]
									next[i] = e.target.value
									setQuestions(next)
									setQuestionsError(false)
								}}
								placeholder={`Тема вопроса ${i + 1}`}
							/>
						))}
						{questionsError && <p className={styles['task40__error']}>Заполните все 4 темы вопросов</p>}
					</div>
					<p className={styles['task40__footer']}>{TASK_FOOTER}</p>
				</div>

				{checkError && <p style={{ color: 'red', margin: '8px 0' }}>{checkError}</p>}

				{mode === 'record' ? (
					<ActiveButton text='Начать подготовку' onClick={handleStartPreparation} />
				) : (
					<div className={styles['task40__upload-area']}>
						<input
							ref={audioInputRef}
							type='file'
							accept='audio/*'
							style={{ display: 'none' }}
							onChange={e => setUploadedAudio(e.target.files?.[0] ?? null)}
						/>
						<button
							className={styles['task40__file-button']}
							onClick={() => audioInputRef.current?.click()}
						>
							Выбрать аудиофайл
						</button>
						{uploadedAudio && (
							<span className={styles['task40__file-name']}>{uploadedAudio.name}</span>
						)}
						<ActiveButton
							text='Отправить на проверку'
							onClick={handleUploadAndSubmit}
						/>
					</div>
				)}
			</div>
		)
	}

	// Preparation phase
	if (phase === 'preparation') {
		return (
			<div className={styles['task40']}>
				<div className={styles['task40__section']}>
					<SecondTitle text='Подготовка' />
					<p className={styles['task40__phase-hint']}>Изучите задание. Запись начнётся автоматически.</p>
					<div className={styles['task40__timer-block']}>
						<span className={cn(styles['task40__timer'], { [styles['task40__timer_warning']]: secondsLeft <= 15 })}>
							{formatTime(secondsLeft)}
						</span>
						<span className={styles['task40__timer-label']}>осталось на подготовку</span>
					</div>
					{taskContent}
				</div>
				<ActiveButton text='Начать запись сейчас' onClick={handleStartRecording} />
			</div>
		)
	}

	// Recording phase
	if (phase === 'recording') {
		return (
			<div className={styles['task40']}>
				<div className={styles['task40__section']}>
					<SecondTitle text='Задавайте вопросы' />
					<div className={styles['task40__timer-block']}>
						<span className={cn(styles['task40__timer'], { [styles['task40__timer_warning']]: secondsLeft <= 15 })}>
							{formatTime(secondsLeft)}
						</span>
						<span className={styles['task40__timer-label']}>осталось на запись</span>
						<div className={styles['task40__recording-indicator']}>
							<div className={styles['task40__recording-dot']} />
							REC
						</div>
					</div>
					{taskContent}
				</div>
				<div className={styles['task40__buttons']}>
					<button className={styles['task40__stop-button']} onClick={handleStopRecording}>
						Стоп и отправить
					</button>
				</div>
			</div>
		)
	}

	// Checking
	if (taskIsChecking || (phase === 'done' && !taskIsChecked)) {
		return (
			<div className={styles['task40']}>
				<CheckingLoader criteriaCount={4} stepDuration={15000} />
			</div>
		)
	}

	// Results
	if (taskIsChecked && ctxResult) {
		return (
			<div className={styles['task40']}>
				{ctxResult.transcription && (
					<div className={styles['task40__section']}>
						<SecondTitle text='Транскрипция' />
						<div className={styles['task40__transcription']}>{ctxResult.transcription}</div>
					</div>
				)}

				<div className={styles['task40__results-section']}>
					<SecondTitle text='Оценки' />
					<div className={styles['task40__marks']}>
						<Criteria maxMark={1} criteriaNumber='К1' criteriaDescription='Вопрос 1' value={ctxResult.k1} readonly />
						<Criteria maxMark={1} criteriaNumber='К2' criteriaDescription='Вопрос 2' value={ctxResult.k2} readonly />
						<Criteria maxMark={1} criteriaNumber='К3' criteriaDescription='Вопрос 3' value={ctxResult.k3} readonly />
						<Criteria maxMark={1} criteriaNumber='К4' criteriaDescription='Вопрос 4' value={ctxResult.k4} readonly />
						<AverageMark num={ctxResult.totalScore} />
					</div>
				</div>

				{ctxResult.feedback?.k1 && (
					<div className={styles['task40__feedback']}>
						<SecondTitle text='Обратная связь' />
						<div className={styles['task40__feedback-item']}>
							<p className={styles['task40__feedback-text']}>{ctxResult.feedback.k1.replace(/\*/g, '')}</p>
						</div>
					</div>
				)}
			</div>
		)
	}

	return null
}

export default Task40
