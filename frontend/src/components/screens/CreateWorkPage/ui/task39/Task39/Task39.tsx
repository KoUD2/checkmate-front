'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import AverageMark from '@/components/ui/AverageMark/AverageMark'
import Criteria from '@/components/ui/Criteria/Criteria'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import TextArea from '@/components/ui/TextArea/TextArea'
import { useAuth } from '@/hooks/useAuth'
import { Task39Result, useTaskCheck } from '@/config/context/TaskCheckContext'
import api from '@/shared/utils/api'
import cn from 'classnames'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import CheckingLoader from '../../CheckingLoader/CheckingLoader'
import styles from './Task39.module.css'

type Phase = 'input' | 'preparation' | 'recording' | 'done'

const PREP_SECONDS = 90   // 1.5 min preparation
const READ_SECONDS = 90   // 1.5 min reading

interface Props {
	onChecked?: () => void
	onReset?: () => void
}

const Task39: FC<Props> = ({ onChecked }) => {
	const { refreshUser } = useAuth()
	const { isChecking, isChecked, taskType, result, error: ctxError, startCheck, completeCheck, failCheck } = useTaskCheck()

	const isThisTask = taskType === '39' || taskType === null

	const [taskText, setTaskText] = useState('')
	const taskTextRef = useRef('')
	const [textError, setTextError] = useState(false)
	const [phase, setPhase] = useState<Phase>('input')
	const [secondsLeft, setSecondsLeft] = useState(PREP_SECONDS)
	const [mode, setMode] = useState<'record' | 'upload'>('record')
	const [uploadedFile, setUploadedFile] = useState<File | null>(null)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])

	const ctxResult = (isThisTask && result?.kind === 'task39') ? result as Task39Result : null
	const checkError = (isThisTask ? ctxError : '') || ''
	const taskIsChecking = isThisTask && isChecking
	const taskIsChecked = isThisTask && isChecked && !!ctxResult

	useEffect(() => {
		if (isThisTask && isChecked && result?.kind === 'task39') {
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
		taskTextRef.current = taskText
		if (!taskText.trim()) {
			setTextError(true)
			return
		}
		setTextError(false)
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
			startCountdown(READ_SECONDS, handleStopRecording)
		} catch {
			failCheck('Не удалось получить доступ к микрофону. Разрешите доступ и попробуйте снова.')
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stopTimer, startCountdown])

	const handleStopRecording = useCallback(() => {
		stopTimer()
		const recorder = mediaRecorderRef.current
		if (!recorder) return

		recorder.onstop = async () => {
			const mimeType = recorder.mimeType || 'audio/webm'
			const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
			recorder.stream.getTracks().forEach(t => t.stop())

			// Convert Blob to base64
			const reader = new FileReader()
			reader.onload = async () => {
				const dataUrl = reader.result as string
				const base64 = dataUrl.split(',')[1]
				const currentTaskText = taskTextRef.current

				startCheck('39', { kind: 'task39', taskText: currentTaskText })
				setPhase('done')

				try {
					const response = await api.post('/tasks/39', {
						taskText: currentTaskText,
						audioBase64: base64,
					})
					const task = response.data?.data?.task
					if (task) {
						completeCheck({
							kind: 'task39',
							k1: task.k1 ?? 0,
							totalScore: task.totalScore ?? 0,
							feedback: task.feedback ?? { k1: '' },
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
			}
			reader.readAsDataURL(audioBlob)
		}

		recorder.stop()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [stopTimer, startCheck, completeCheck, failCheck, onChecked, refreshUser])

	const handleUploadAndSubmit = () => {
		if (!uploadedFile || !taskText.trim()) {
			if (!taskText.trim()) setTextError(true)
			return
		}
		setTextError(false)
		taskTextRef.current = taskText
		const reader = new FileReader()
		reader.onload = async () => {
			const base64 = (reader.result as string).split(',')[1]
			const currentTaskText = taskTextRef.current
			startCheck('39', { kind: 'task39', taskText: currentTaskText })
			setPhase('done')
			try {
				const response = await api.post('/tasks/39', { taskText: currentTaskText, audioBase64: base64 })
				const task = response.data?.data?.task
				if (task) {
					completeCheck({
						kind: 'task39',
						k1: task.k1 ?? 0,
						totalScore: task.totalScore ?? 0,
						feedback: task.feedback ?? { k1: '' },
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
		}
		reader.readAsDataURL(uploadedFile)
	}

	const formatTime = (s: number) => {
		const m = Math.floor(s / 60)
		const sec = s % 60
		return `${m}:${sec.toString().padStart(2, '0')}`
	}

	const total = ctxResult?.totalScore ?? 0

	// Input phase
	if (phase === 'input' && !taskIsChecking && !taskIsChecked) {
		return (
			<div className={styles['task39']}>
				<div className={styles['task39__mode-tabs']}>
					<button
						className={cn(styles['task39__mode-tab'], { [styles['task39__mode-tab_active']]: mode === 'record' })}
						onClick={() => { setMode('record'); setUploadedFile(null) }}
					>
						Записать
					</button>
					<button
						className={cn(styles['task39__mode-tab'], { [styles['task39__mode-tab_active']]: mode === 'upload' })}
						onClick={() => { setMode('upload'); setUploadedFile(null) }}
					>
						Загрузить аудио
					</button>
				</div>
				<div className={styles['task39__section']}>
					<p className={styles['task39__phase-hint']}>
						{mode === 'record'
							? 'Вставьте текст задания для чтения вслух, затем нажмите «Начать подготовку». У вас будет 1:30 на чтение про себя и 1:30 на чтение вслух.'
							: 'Вставьте текст задания и загрузите аудиозапись вашего чтения для проверки.'}
					</p>
					<TextArea
						className={cn(styles['task39__text-area'], {
							[styles['task39__textarea_error']]: textError,
						})}
						placeholder='Вставьте текст задания...'
						value={taskText}
						onChange={value => { setTextError(false); setTaskText(value) }}
					/>
				</div>
				{checkError && <p style={{ color: 'red', margin: '8px 0' }}>{checkError}</p>}
				{mode === 'record' ? (
					<ActiveButton text='Начать подготовку' onClick={handleStartPreparation} />
				) : (
					<div className={styles['task39__upload-area']}>
						<input
							ref={fileInputRef}
							type='file'
							accept='audio/*'
							style={{ display: 'none' }}
							onChange={e => setUploadedFile(e.target.files?.[0] ?? null)}
						/>
						<button
							className={styles['task39__file-button']}
							onClick={() => fileInputRef.current?.click()}
						>
							Выбрать файл
						</button>
						{uploadedFile && (
							<span className={styles['task39__file-name']}>{uploadedFile.name}</span>
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
			<div className={styles['task39']}>
				<div className={styles['task39__section']}>
					<SecondTitle text='Подготовка к чтению' />
					<p className={styles['task39__phase-hint']}>Прочитайте текст про себя. Запись начнётся автоматически.</p>
					<div className={styles['task39__timer-block']}>
						<span className={cn(styles['task39__timer'], { [styles['task39__timer_warning']]: secondsLeft <= 15 })}>
							{formatTime(secondsLeft)}
						</span>
						<span className={styles['task39__timer-label']}>осталось на подготовку</span>
					</div>
					<div className={styles['task39__reading-text']}>{taskText}</div>
				</div>
				<ActiveButton text='Начать запись сейчас' onClick={handleStartRecording} />
			</div>
		)
	}

	// Recording phase
	if (phase === 'recording') {
		return (
			<div className={styles['task39']}>
				<div className={styles['task39__section']}>
					<SecondTitle text='Читайте вслух' />
					<div className={styles['task39__timer-block']}>
						<span className={cn(styles['task39__timer'], { [styles['task39__timer_warning']]: secondsLeft <= 15 })}>
							{formatTime(secondsLeft)}
						</span>
						<span className={styles['task39__timer-label']}>осталось на чтение</span>
						<div className={styles['task39__recording-indicator']}>
							<div className={styles['task39__recording-dot']} />
							REC
						</div>
					</div>
					<div className={styles['task39__reading-text']}>{taskText}</div>
				</div>
				<div className={styles['task39__buttons']}>
					<button className={styles['task39__stop-button']} onClick={handleStopRecording}>
						Стоп и отправить
					</button>
				</div>
			</div>
		)
	}

	// Submitting / checking state
	if (taskIsChecking || (phase === 'done' && !taskIsChecked)) {
		return (
			<div className={styles['task39']}>
				<CheckingLoader criteriaCount={1} stepDuration={15000} />
			</div>
		)
	}

	// Results
	if (taskIsChecked && ctxResult) {
		return (
			<div className={styles['task39']}>
				{ctxResult.transcription && (
					<div className={styles['task39__section']}>
						<SecondTitle text='Транскрипция' />
						<div className={styles['task39__transcription']}>{ctxResult.transcription}</div>
					</div>
				)}

				<div className={styles['task39__results-section']}>
					<SecondTitle text='Оценки' />
					<div className={styles['task39__marks']}>
						<Criteria maxMark={1} criteriaNumber='К1' criteriaDescription='Фонетическая сторона речи' value={ctxResult.k1} readonly />
						<AverageMark num={total} />
					</div>
				</div>

				{ctxResult.feedback && (
					<div className={styles['task39__feedback']}>
						<SecondTitle text='Обратная связь' />
						{(['k1'] as const).map(key =>
							ctxResult.feedback[key] ? (
								<div key={key} className={styles['task39__feedback-item']}>
									<p className={styles['task39__feedback-label']}>{key.toUpperCase()}</p>
									<p className={styles['task39__feedback-text']}>{ctxResult.feedback[key].replace(/\*/g, '')}</p>
								</div>
							) : null
						)}
					</div>
				)}
			</div>
		)
	}

	return null
}

export default Task39
