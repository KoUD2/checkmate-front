'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import AverageMark from '@/components/ui/AverageMark/AverageMark'
import Criteria from '@/components/ui/Criteria/Criteria'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import { useAuth } from '@/hooks/useAuth'
import { Task42Result, useTaskCheck } from '@/config/context/TaskCheckContext'
import api from '@/shared/utils/api'
import cn from 'classnames'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import CheckingLoader from '../../CheckingLoader/CheckingLoader'
import styles from './Task42.module.css'

type Phase = 'input' | 'preparation' | 'recording' | 'done'

const PREP_SECONDS = 90
const REC_TARGET_SECONDS = 150
const REC_MAX_SECONDS = 180

const FIXED_BULLET = 'explain the choice of the illustrations for the project by briefly describing them and noting the differences;'
const TASK_FOOTER = 'You will speak for not more than 3 minutes (12–15 sentences). You have to talk continuously.'

const DEFAULT_TASK_TEXT = ''
const DEFAULT_BULLETS = ['', '', '']

interface TaskSnapshot {
	taskText: string
	bullets: string[]
	image1: string | null
	image2: string | null
}

interface Props {
	onChecked?: () => void
	onReset?: () => void
}

const Task42: FC<Props> = ({ onChecked }) => {
	const { refreshUser } = useAuth()
	const { isChecking, isChecked, taskType, result, error: ctxError, startCheck, completeCheck, failCheck } = useTaskCheck()

	const isThisTask = taskType === '42' || taskType === null

	const [phase, setPhase] = useState<Phase>('input')
	const [mode, setMode] = useState<'record' | 'upload'>('record')

	// Input state
	const [taskText, setTaskText] = useState(DEFAULT_TASK_TEXT)
	const [bullets, setBullets] = useState(DEFAULT_BULLETS)
	const [image1, setImage1] = useState<string | null>(null)
	const [image2, setImage2] = useState<string | null>(null)
	const [formError, setFormError] = useState('')
	const [uploadedAudio, setUploadedAudio] = useState<File | null>(null)

	const image1Ref = useRef<HTMLInputElement>(null)
	const image2Ref = useRef<HTMLInputElement>(null)
	const audioInputRef = useRef<HTMLInputElement>(null)

	// Snapshot captured at prep start
	const snapshotRef = useRef<TaskSnapshot>({ taskText: DEFAULT_TASK_TEXT, bullets: DEFAULT_BULLETS, image1: null, image2: null })

	const [prepSecondsLeft, setPrepSecondsLeft] = useState(PREP_SECONDS)
	const [recSecondsLeft, setRecSecondsLeft] = useState(REC_TARGET_SECONDS)

	const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const prepSecondsRef = useRef(PREP_SECONDS)
	const recSecondsRef = useRef(REC_MAX_SECONDS)

	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])
	const doStopRecordingRef = useRef<() => void>(() => {})

	const ctxResult = (isThisTask && result?.kind === 'task42') ? result as Task42Result : null
	const checkError = (isThisTask ? ctxError : '') || ''
	const taskIsChecking = isThisTask && isChecking
	const taskIsChecked = isThisTask && isChecked && !!ctxResult

	useEffect(() => {
		if (isThisTask && isChecked && result?.kind === 'task42') onChecked?.()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => () => {
		if (prepTimerRef.current) clearInterval(prepTimerRef.current)
		if (recTimerRef.current) clearInterval(recTimerRef.current)
	}, [])

	const formatTime = (s: number) => {
		const m = Math.floor(Math.abs(s) / 60)
		const sec = Math.abs(s) % 60
		return `${m}:${String(sec).padStart(2, '0')}`
	}

	// ─── Image upload helpers ─────────────────────────────────────────────────

	const handleImageUpload = (file: File, setFn: (v: string) => void) => {
		const reader = new FileReader()
		reader.onload = () => setFn(reader.result as string)
		reader.readAsDataURL(file)
	}

	// ─── Validate form ────────────────────────────────────────────────────────

	const validateForm = () => {
		if (!taskText.trim()) { setFormError('Введите текст задания'); return false }
		if (bullets.some(b => !b.trim())) { setFormError('Заполните все 3 пункта задания'); return false }
		if (!image1) { setFormError('Загрузите Фото 1'); return false }
		if (!image2) { setFormError('Загрузите Фото 2'); return false }
		setFormError('')
		snapshotRef.current = { taskText: taskText.trim(), bullets: bullets.map(b => b.trim()), image1, image2 }
		return true
	}

	// ─── Submit form → start preparation ─────────────────────────────────────

	const handleStartPreparation = () => {
		if (!validateForm()) return
		setPhase('preparation')
	}

	// ─── Upload mode submit ───────────────────────────────────────────────────

	const handleUploadAndSubmit = () => {
		if (!validateForm()) return
		if (!uploadedAudio) { setFormError('Выберите аудиофайл'); return }
		const reader = new FileReader()
		reader.onload = async () => {
			const dataUrl = reader.result as string
			await submitAudio(dataUrl.split(',')[1])
		}
		reader.readAsDataURL(uploadedAudio)
	}

	// ─── Submit audio ─────────────────────────────────────────────────────────

	const submitAudio = useCallback(async (audioBase64: string) => {
		startCheck('42', { kind: 'task42' })
		setPhase('done')
		try {
			const { taskText: t, bullets: b, image1, image2 } = snapshotRef.current
			const stripPrefix = (dataUrl: string) => dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
			const response = await api.post('/tasks/42', {
				audioBase64,
				taskText: t,
				bullets: b,
				...(image1 ? { image1Base64: stripPrefix(image1) } : {}),
				...(image2 ? { image2Base64: stripPrefix(image2) } : {}),
			})
			const task = response.data?.data?.task
			if (task) {
				completeCheck({
					kind: 'task42',
					k1: task.k1 ?? 0,
					k2: task.k2 ?? 0,
					k3: task.k3 ?? 0,
					totalScore: task.totalScore ?? 0,
					feedback: task.feedback ?? { k1: '', k2: '', k3: '' },
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
			setPhase('preparation')
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [startCheck, completeCheck, failCheck, onChecked, refreshUser])

	const submitAudioRef = useRef(submitAudio)
	useEffect(() => { submitAudioRef.current = submitAudio }, [submitAudio])

	// ─── Stop recording ───────────────────────────────────────────────────────

	useEffect(() => {
		doStopRecordingRef.current = () => {
			if (recTimerRef.current) { clearInterval(recTimerRef.current); recTimerRef.current = null }
			const recorder = mediaRecorderRef.current
			if (!recorder || recorder.state === 'inactive') return
			recorder.onstop = async () => {
				const mimeType = recorder.mimeType || 'audio/webm'
				const blob = new Blob(audioChunksRef.current, { type: mimeType })
				recorder.stream.getTracks().forEach(t => t.stop())
				const reader = new FileReader()
				reader.onload = async () => {
					const base64 = (reader.result as string).split(',')[1]
					await submitAudioRef.current(base64)
				}
				reader.readAsDataURL(blob)
			}
			recorder.stop()
		}
	})

	// ─── Start recording ──────────────────────────────────────────────────────

	const handleStartRecording = useCallback(async () => {
		if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null }

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
		} catch {
			failCheck('Не удалось получить доступ к микрофону. Разрешите доступ и попробуйте снова.')
			return
		}

		setPhase('recording')
		recSecondsRef.current = REC_MAX_SECONDS
		setRecSecondsLeft(REC_TARGET_SECONDS)

		recTimerRef.current = setInterval(() => {
			recSecondsRef.current--
			setRecSecondsLeft(recSecondsRef.current - (REC_MAX_SECONDS - REC_TARGET_SECONDS))
			if (recSecondsRef.current <= 0) {
				clearInterval(recTimerRef.current!)
				recTimerRef.current = null
				doStopRecordingRef.current()
			}
		}, 1000)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [failCheck])

	const handleStartRecordingRef = useRef(handleStartRecording)
	useEffect(() => { handleStartRecordingRef.current = handleStartRecording }, [handleStartRecording])

	// ─── Preparation countdown ────────────────────────────────────────────────

	useEffect(() => {
		if (phase !== 'preparation') return
		prepSecondsRef.current = PREP_SECONDS
		setPrepSecondsLeft(PREP_SECONDS)

		prepTimerRef.current = setInterval(() => {
			prepSecondsRef.current--
			setPrepSecondsLeft(prepSecondsRef.current)
			if (prepSecondsRef.current <= 0) {
				clearInterval(prepTimerRef.current!)
				prepTimerRef.current = null
				handleStartRecordingRef.current()
			}
		}, 1000)

		return () => {
			if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null }
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [phase])

	// ─── Task content block (prep + recording) ────────────────────────────────

	const snap = snapshotRef.current
	const taskContent = (
		<div className={styles['task42__task-content']}>
			<p className={styles['task42__instruction']}>{snap.taskText}</p>
			<div className={styles['task42__points']}>
				{[FIXED_BULLET, ...snap.bullets].map((point, i) => (
					<div key={i} className={styles['task42__point']}>
						<span className={styles['task42__point-dash']}>—</span>
						<span>{point}</span>
					</div>
				))}
			</div>
			<p className={styles['task42__footer']}>{TASK_FOOTER}</p>
		</div>
	)

	const imagesBlock = (snap.image1 || snap.image2) && (
		<div className={styles['task42__images']}>
			<div className={styles['task42__image-wrap']}>
				<span className={styles['task42__image-label']}>Фото 1</span>
				{snap.image1
					? <img src={snap.image1} alt='Фото 1' className={styles['task42__image']} />
					: <div className={styles['task42__image-placeholder']}>Нет фото</div>
				}
			</div>
			<div className={styles['task42__image-wrap']}>
				<span className={styles['task42__image-label']}>Фото 2</span>
				{snap.image2
					? <img src={snap.image2} alt='Фото 2' className={styles['task42__image']} />
					: <div className={styles['task42__image-placeholder']}>Нет фото</div>
				}
			</div>
		</div>
	)

	// ─── INPUT PHASE ──────────────────────────────────────────────────────────

	if (phase === 'input' && !taskIsChecking && !taskIsChecked) {
		return (
			<div className={styles['task42']}>
				<div className={styles['task42__mode-tabs']}>
					<button
						className={cn(styles['task42__mode-tab'], { [styles['task42__mode-tab_active']]: mode === 'record' })}
						onClick={() => { setMode('record'); setUploadedAudio(null) }}
					>Записать</button>
					<button
						className={cn(styles['task42__mode-tab'], { [styles['task42__mode-tab_active']]: mode === 'upload' })}
						onClick={() => { setMode('upload'); setUploadedAudio(null) }}
					>Загрузить аудио</button>
				</div>

				<div className={styles['task42__section']}>
					<div className={styles['task42__input-group']}>
						<label className={styles['task42__label']}>Текст задания</label>
						<textarea
							className={styles['task42__textarea']}
							value={taskText}
							onChange={e => setTaskText(e.target.value)}
							rows={3}
						/>
					</div>

					<div className={styles['task42__input-group']}>
						<label className={styles['task42__label']}>Пункты задания</label>
						<div className={styles['task42__fixed-bullet']}>
							<span className={styles['task42__point-dash']}>—</span>
							<span className={styles['task42__fixed-bullet-text']}>{FIXED_BULLET}</span>
						</div>
						{bullets.map((b, i) => (
							<div key={i} className={styles['task42__bullet-row']}>
								<span className={styles['task42__point-dash']}>—</span>
								<input
									className={styles['task42__bullet-input']}
									value={b}
									onChange={e => setBullets(prev => prev.map((x, j) => j === i ? e.target.value : x))}
									placeholder={`Пункт ${i + 2}`}
								/>
							</div>
						))}
					</div>

					<div className={styles['task42__input-group']}>
						<label className={styles['task42__label']}>Иллюстрации</label>
						<div className={styles['task42__image-uploads']}>
							<div className={styles['task42__upload-item']}>
								<span className={styles['task42__upload-label']}>Фото 1</span>
								{image1
									? <img src={image1} alt='Фото 1' className={styles['task42__upload-preview']} />
									: <div className={styles['task42__upload-empty']}>Не загружено</div>
								}
								<input ref={image1Ref} type='file' accept='image/*' style={{ display: 'none' }}
									onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], setImage1)} />
								<button className={styles['task42__file-button']} onClick={() => image1Ref.current?.click()}>
									{image1 ? 'Заменить' : 'Загрузить'}
								</button>
							</div>
							<div className={styles['task42__upload-item']}>
								<span className={styles['task42__upload-label']}>Фото 2</span>
								{image2
									? <img src={image2} alt='Фото 2' className={styles['task42__upload-preview']} />
									: <div className={styles['task42__upload-empty']}>Не загружено</div>
								}
								<input ref={image2Ref} type='file' accept='image/*' style={{ display: 'none' }}
									onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], setImage2)} />
								<button className={styles['task42__file-button']} onClick={() => image2Ref.current?.click()}>
									{image2 ? 'Заменить' : 'Загрузить'}
								</button>
							</div>
						</div>
					</div>

					{formError && <p className={styles['task42__error']}>{formError}</p>}
				</div>

				{mode === 'record' ? (
					<ActiveButton text='Начать подготовку' onClick={handleStartPreparation} />
				) : (
					<div className={styles['task42__upload-area']}>
						<input ref={audioInputRef} type='file' accept='audio/*' style={{ display: 'none' }}
							onChange={e => { setUploadedAudio(e.target.files?.[0] ?? null); setFormError('') }} />
						<button className={styles['task42__file-button']} onClick={() => audioInputRef.current?.click()}>
							Выбрать аудиофайл
						</button>
						{uploadedAudio && <span className={styles['task42__file-name']}>{uploadedAudio.name}</span>}
						<ActiveButton text='Отправить на проверку' onClick={handleUploadAndSubmit} />
					</div>
				)}
			</div>
		)
	}

	// ─── PREPARATION PHASE ────────────────────────────────────────────────────

	if (phase === 'preparation') {
		return (
			<div className={styles['task42']}>
				<div className={styles['task42__section']}>
					<div className={styles['task42__timer-block']}>
						<span className={cn(styles['task42__timer'], { [styles['task42__timer_warning']]: prepSecondsLeft <= 15 })}>
							{formatTime(prepSecondsLeft)}
						</span>
						<span className={styles['task42__timer-label']}>осталось на подготовку</span>
					</div>
					{taskContent}
					{imagesBlock}
				</div>
				<ActiveButton text='Начать запись сейчас' onClick={handleStartRecording} />
			</div>
		)
	}

	// ─── RECORDING PHASE ──────────────────────────────────────────────────────

	if (phase === 'recording') {
		const isOvertime = recSecondsLeft < 0
		return (
			<div className={styles['task42']}>
				<div className={styles['task42__section']}>
					<div className={styles['task42__timer-block']}>
						<span className={cn(styles['task42__timer'], { [styles['task42__timer_warning']]: recSecondsLeft <= 15 })}>
							{isOvertime ? `+${formatTime(-recSecondsLeft)}` : formatTime(recSecondsLeft)}
						</span>
						<div>
							<div className={styles['task42__stage-label']}>
								{isOvertime ? 'Превышено рекомендуемое время' : 'Говорите непрерывно'}
							</div>
							<span className={styles['task42__timer-label']}>
								{isOvertime ? 'запись завершится автоматически' : 'рекомендуемое время — 2:30'}
							</span>
						</div>
						<div className={styles['task42__recording-indicator']}>
							<div className={styles['task42__recording-dot']} />
							REC
						</div>
					</div>
					{taskContent}
					{imagesBlock}
				</div>
				<div className={styles['task42__buttons']}>
					<button className={styles['task42__stop-button']} onClick={() => doStopRecordingRef.current()}>
						Завершить запись
					</button>
				</div>
			</div>
		)
	}

	// ─── CHECKING / RESULTS ───────────────────────────────────────────────────

	if (taskIsChecking || (phase === 'done' && !taskIsChecked)) {
		return (
			<div className={styles['task42']}>
				<CheckingLoader criteriaCount={3} stepDuration={15000} />
			</div>
		)
	}

	if (taskIsChecked && ctxResult) {
		return (
			<div className={styles['task42']}>
				{(snap.taskText || snap.image1 || snap.image2) && (
					<div className={styles['task42__section']}>
						{snap.taskText && taskContent}
						{imagesBlock}
					</div>
				)}
				{ctxResult.transcription && (
					<div className={styles['task42__section']}>
						<SecondTitle text='Транскрипция' />
						<div className={styles['task42__transcription']}>{ctxResult.transcription}</div>
					</div>
				)}
				<div className={styles['task42__results-section']}>
					<SecondTitle text='Оценки' />
					<div className={styles['task42__marks']}>
						<Criteria maxMark={4} criteriaNumber='К1' criteriaDescription='Решение коммуникативной задачи' value={ctxResult.k1} readonly />
						<Criteria maxMark={3} criteriaNumber='К2' criteriaDescription='Организация высказывания' value={ctxResult.k2} readonly />
						<Criteria maxMark={3} criteriaNumber='К3' criteriaDescription='Языковое оформление' value={ctxResult.k3} readonly />
						<AverageMark num={ctxResult.totalScore} />
					</div>
				</div>
				{(ctxResult.feedback?.k1 || ctxResult.feedback?.k2 || ctxResult.feedback?.k3) && (
					<div className={styles['task42__feedback']}>
						<SecondTitle text='Обратная связь' />
						{(['k1', 'k2', 'k3'] as const).map(key => ctxResult.feedback[key] ? (
							<div key={key} className={styles['task42__feedback-item']}>
								<p className={styles['task42__feedback-text']}>{ctxResult.feedback[key].replace(/\*/g, '')}</p>
							</div>
						) : null)}
					</div>
				)}
				{checkError && <p style={{ color: '#eb3131', fontSize: '1vw' }}>{checkError}</p>}
			</div>
		)
	}

	return null
}

export default Task42
