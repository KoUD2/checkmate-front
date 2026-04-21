'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import AverageMark from '@/components/ui/AverageMark/AverageMark'
import Criteria from '@/components/ui/Criteria/Criteria'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import { useAuth } from '@/hooks/useAuth'
import { Task41Result, useTaskCheck } from '@/config/context/TaskCheckContext'
import api from '@/shared/utils/api'
import cn from 'classnames'
import { FC, useCallback, useEffect, useRef, useState } from 'react'
import CheckingLoader from '../../CheckingLoader/CheckingLoader'
import styles from './Task41.module.css'

type Phase = 'input' | 'preparation' | 'recording' | 'done'
type RecordStage = 'intro' | 'q-speaking' | 'answering' | 'outro'

const PREP_SECONDS = 90
const ANSWER_SECONDS = 40
const OUTRO_TEXT = 'Thank you very much for your interview.'
const TASK_INSTRUCTION = 'You are going to give an interview. You have to answer five questions. Give full answers to the questions (2–3 sentences).'
const TASK_FOOTER = 'You have 40 seconds to answer each question.'

interface Props {
	onChecked?: () => void
	onReset?: () => void
}

const Task41: FC<Props> = ({ onChecked }) => {
	const { refreshUser } = useAuth()
	const { isChecking, isChecked, taskType, result, error: ctxError, startCheck, completeCheck, failCheck } = useTaskCheck()

	const isThisTask = taskType === '41' || taskType === null

	const [phase, setPhase] = useState<Phase>('input')
	const [mode, setMode] = useState<'record' | 'upload'>('record')
	const [introText, setIntroText] = useState('')
	const [questions, setQuestions] = useState(['', '', '', '', ''])
	const [formError, setFormError] = useState('')

	const [recordStage, setRecordStage] = useState<RecordStage>('intro')
	const [currentQuestion, setCurrentQuestion] = useState(0)
	const [answerSecondsLeft, setAnswerSecondsLeft] = useState(ANSWER_SECONDS)
	const [prepSecondsLeft, setPrepSecondsLeft] = useState(PREP_SECONDS)

	const [uploadedAudio, setUploadedAudio] = useState<File | null>(null)
	const audioInputRef = useRef<HTMLInputElement>(null)

	// Timers
	const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const answerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
	// Countdown values via refs to avoid stale closures in setInterval
	const prepSecondsRef = useRef(PREP_SECONDS)
	const answerSecondsRef = useRef(ANSWER_SECONDS)

	// MediaRecorder
	const mediaRecorderRef = useRef<MediaRecorder | null>(null)
	const audioChunksRef = useRef<Blob[]>([])

	// Snapshot of task data captured at prep-start, used throughout recording
	const recordDataRef = useRef({ introText: '', questions: ['', '', '', '', ''] })

	const ctxResult = (isThisTask && result?.kind === 'task41') ? result as Task41Result : null
	const checkError = (isThisTask ? ctxError : '') || ''
	const taskIsChecking = isThisTask && isChecking
	const taskIsChecked = isThisTask && isChecked && !!ctxResult

	useEffect(() => {
		if (isThisTask && isChecked && result?.kind === 'task41') onChecked?.()
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => () => {
		if (prepTimerRef.current) clearInterval(prepTimerRef.current)
		if (answerTimerRef.current) clearInterval(answerTimerRef.current)
		if (typeof window !== 'undefined') window.speechSynthesis?.cancel()
	}, [])

	// ─── TTS ─────────────────────────────────────────────────────────────────

	const ttsSpeak = useCallback((text: string, onEnd: () => void) => {
		if (typeof window === 'undefined' || !window.speechSynthesis) { onEnd(); return }
		const synth = window.speechSynthesis
		synth.cancel()

		const doSpeak = () => {
			const u = new SpeechSynthesisUtterance(text)
			u.lang = 'en-US'
			u.rate = 0.9
			const voices = synth.getVoices()
			const enVoice = voices.find(v => v.lang.startsWith('en'))
			if (enVoice) u.voice = enVoice
			u.onend = onEnd
			u.onerror = (e: SpeechSynthesisErrorEvent) => {
				if (e.error !== 'interrupted' && e.error !== 'canceled') onEnd()
			}
			synth.speak(u)
			// Chrome bug: synthesis can get paused after cancel
			setTimeout(() => { if (synth.paused) synth.resume() }, 100)
		}

		// Chrome loads voices asynchronously — wait if not ready yet
		const voices = synth.getVoices()
		if (voices.length > 0) {
			setTimeout(doSpeak, 50) // brief pause after cancel() — Chrome requires it
		} else {
			const handler = () => {
				synth.removeEventListener('voiceschanged', handler)
				setTimeout(doSpeak, 50)
			}
			synth.addEventListener('voiceschanged', handler)
		}
	}, [])

	// ─── Recording chain ─────────────────────────────────────────────────────

	// Forward-declared ref so countdown can reference itself recursively
	const startAnswerCountdownRef = useRef<(idx: number) => void>(() => {})
	const doStopRecordingRef = useRef<() => void>(() => {})

	const submitAudio = useCallback(async (audioBase64: string) => {
		startCheck('41', { kind: 'task41' })
		setPhase('done')
		try {
			const response = await api.post('/tasks/41', {
				audioBase64,
				questions: recordDataRef.current.questions,
			})
			const task = response.data?.data?.task
			if (task) {
				completeCheck({
					kind: 'task41',
					k1: task.k1 ?? 0, k2: task.k2 ?? 0, k3: task.k3 ?? 0,
					k4: task.k4 ?? 0, k5: task.k5 ?? 0,
					totalScore: task.totalScore ?? 0,
					feedback: task.feedback ?? { k1: '', k2: '', k3: '', k4: '', k5: '' },
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
	}, [startCheck, completeCheck, failCheck, onChecked, refreshUser])

	const submitAudioRef = useRef(submitAudio)
	useEffect(() => { submitAudioRef.current = submitAudio }, [submitAudio])

	// Wire up doStopRecording
	useEffect(() => {
		doStopRecordingRef.current = () => {
			if (answerTimerRef.current) { clearInterval(answerTimerRef.current); answerTimerRef.current = null }
			window.speechSynthesis?.cancel()
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
	}) // run every render so it always has latest submitAudio

	// Wire up startAnswerCountdown
	useEffect(() => {
		startAnswerCountdownRef.current = (questionIdx: number) => {
			if (answerTimerRef.current) { clearInterval(answerTimerRef.current); answerTimerRef.current = null }
			setRecordStage('answering')
			answerSecondsRef.current = ANSWER_SECONDS
			setAnswerSecondsLeft(ANSWER_SECONDS)

			answerTimerRef.current = setInterval(() => {
				answerSecondsRef.current--
				setAnswerSecondsLeft(answerSecondsRef.current)

				if (answerSecondsRef.current <= 0) {
					clearInterval(answerTimerRef.current!)
					answerTimerRef.current = null

					if (questionIdx < 4) {
						const nextIdx = questionIdx + 1
						setCurrentQuestion(nextIdx)
						setRecordStage('q-speaking')
						ttsSpeak(recordDataRef.current.questions[nextIdx], () => {
							startAnswerCountdownRef.current(nextIdx)
						})
					} else {
						setRecordStage('outro')
						ttsSpeak(OUTRO_TEXT, () => doStopRecordingRef.current())
					}
				}
			}, 1000)
		}
	}) // run every render so ttsSpeak reference is always fresh

	// ─── Start recording ─────────────────────────────────────────────────────

	const handleStartRecording = useCallback(async () => {
		if (prepTimerRef.current) { clearInterval(prepTimerRef.current); prepTimerRef.current = null }

		// ① Start TTS chain SYNCHRONOUSLY (before any await) so it runs in user-gesture context
		setPhase('recording')
		setRecordStage('intro')
		setCurrentQuestion(0)

		const kickOffTTS = () => {
			setCurrentQuestion(0)
			setRecordStage('q-speaking')
			ttsSpeak(recordDataRef.current.questions[0], () => {
				startAnswerCountdownRef.current(0)
			})
		}

		const intro = recordDataRef.current.introText
		if (intro) {
			ttsSpeak(intro, kickOffTTS)
		} else {
			kickOffTTS()
		}

		// ② Acquire mic (async) — TTS is already running
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
			window.speechSynthesis?.cancel()
			if (answerTimerRef.current) { clearInterval(answerTimerRef.current); answerTimerRef.current = null }
			setPhase('input')
			failCheck('Не удалось получить доступ к микрофону. Разрешите доступ и попробуйте снова.')
		}
	}, [ttsSpeak, failCheck])

	// Keep ref so prep-timer callback always calls the latest version
	const handleStartRecordingRef = useRef(handleStartRecording)
	useEffect(() => { handleStartRecordingRef.current = handleStartRecording }, [handleStartRecording])

	// ─── Preparation phase ───────────────────────────────────────────────────

	const handleStartPreparation = () => {
		if (!questions.every(q => q.trim())) {
			setFormError('Заполните все 5 вопросов интервьюера')
			return
		}
		setFormError('')
		// Snapshot data NOW so it's available throughout recording
		recordDataRef.current = { introText: introText.trim(), questions: [...questions] }

		setPhase('preparation')
		prepSecondsRef.current = PREP_SECONDS
		setPrepSecondsLeft(PREP_SECONDS)

		prepTimerRef.current = setInterval(() => {
			prepSecondsRef.current--
			if (prepSecondsRef.current <= 0) {
				clearInterval(prepTimerRef.current!)
				prepTimerRef.current = null
				setPrepSecondsLeft(0)
				handleStartRecordingRef.current()
			} else {
				setPrepSecondsLeft(prepSecondsRef.current)
			}
		}, 1000)
	}

	// ─── Upload mode ─────────────────────────────────────────────────────────

	const handleUploadAndSubmit = () => {
		if (!questions.every(q => q.trim())) {
			setFormError('Заполните все 5 вопросов интервьюера')
			return
		}
		if (!uploadedAudio) return
		setFormError('')
		recordDataRef.current = { introText: introText.trim(), questions: [...questions] }
		const reader = new FileReader()
		reader.onload = async () => await submitAudio(reader.result as string)
		reader.readAsDataURL(uploadedAudio)
	}

	const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

	// ─── Prep content (shown during preparation) ──────────────────────────────

	const prepContent = (
		<div className={styles['task41__task-content']}>
			<p className={styles['task41__instruction']}>{TASK_INSTRUCTION}</p>
			{introText.trim() && (
				<div className={styles['task41__intro-preview']}>
					<p className={styles['task41__intro-text']}>{introText}</p>
				</div>
			)}
			<div className={styles['task41__questions']}>
				{questions.map((q, i) => (
					<div key={i} className={styles['task41__question-item']}>
						<span className={styles['task41__question-num']}>{i + 1}</span>
						<span>{q || `Вопрос ${i + 1}`}</span>
					</div>
				))}
			</div>
			<p className={styles['task41__footer']}>{TASK_FOOTER}</p>
		</div>
	)

	// ─── Render ───────────────────────────────────────────────────────────────

	if (phase === 'input' && !taskIsChecking && !taskIsChecked) {
		return (
			<div className={styles['task41']}>
				<div className={styles['task41__mode-tabs']}>
					<button
						className={cn(styles['task41__mode-tab'], { [styles['task41__mode-tab_active']]: mode === 'record' })}
						onClick={() => { setMode('record'); setUploadedAudio(null) }}
					>Записать</button>
					<button
						className={cn(styles['task41__mode-tab'], { [styles['task41__mode-tab_active']]: mode === 'upload' })}
						onClick={() => { setMode('upload'); setUploadedAudio(null) }}
					>Загрузить аудио</button>
				</div>

				<div className={styles['task41__task-content']}>
					<p className={styles['task41__instruction']}>{TASK_INSTRUCTION}</p>
					<textarea
						className={styles['task41__intro-input']}
						value={introText}
						onChange={e => setIntroText(e.target.value)}
						placeholder="Вставьте вступительное слово интервьюера (Hello everybody! It's Teenagers Round the World Channel...)"
						rows={3}
					/>
					<div className={styles['task41__questions-inputs']}>
						{questions.map((q, i) => (
							<input
								key={i}
								className={cn(styles['task41__question-input'], {
									[styles['task41__question-input_error']]: formError && !q.trim(),
								})}
								value={q}
								onChange={e => {
									const next = [...questions]; next[i] = e.target.value
									setQuestions(next); setFormError('')
								}}
								placeholder={`Вопрос интервьюера ${i + 1}`}
							/>
						))}
						{formError && <p className={styles['task41__error']}>{formError}</p>}
					</div>
					<p className={styles['task41__footer']}>{TASK_FOOTER}</p>
				</div>

				{checkError && <p style={{ color: 'red', margin: '8px 0' }}>{checkError}</p>}

				{mode === 'record' ? (
					<ActiveButton text='Начать подготовку' onClick={handleStartPreparation} />
				) : (
					<div className={styles['task41__upload-area']}>
						<input ref={audioInputRef} type='file' accept='audio/*' style={{ display: 'none' }}
							onChange={e => setUploadedAudio(e.target.files?.[0] ?? null)} />
						<button className={styles['task41__file-button']} onClick={() => audioInputRef.current?.click()}>
							Выбрать аудиофайл
						</button>
						{uploadedAudio && <span className={styles['task41__file-name']}>{uploadedAudio.name}</span>}
						<ActiveButton text='Отправить на проверку' onClick={handleUploadAndSubmit} />
					</div>
				)}
			</div>
		)
	}

	if (phase === 'preparation') {
		return (
			<div className={styles['task41']}>
				<div className={styles['task41__section']}>
					<SecondTitle text='Подготовка' />
					<p className={styles['task41__phase-hint']}>Изучите вопросы. Запись начнётся автоматически.</p>
					<div className={styles['task41__timer-block']}>
						<span className={cn(styles['task41__timer'], { [styles['task41__timer_warning']]: prepSecondsLeft <= 15 })}>
							{formatTime(prepSecondsLeft)}
						</span>
						<span className={styles['task41__timer-label']}>осталось на подготовку</span>
					</div>
					{prepContent}
				</div>
				<ActiveButton text='Начать запись сейчас' onClick={handleStartRecording} />
			</div>
		)
	}

	if (phase === 'recording') {
		const stageLabel =
			recordStage === 'intro'     ? 'Слушайте вступление...' :
			recordStage === 'q-speaking' ? `Вопрос ${currentQuestion + 1} из 5 — слушайте вопрос...` :
			recordStage === 'answering'  ? `Вопрос ${currentQuestion + 1} из 5 — ваш ответ` :
			                              'Интервью завершается...'

		return (
			<div className={styles['task41']}>
				<div className={styles['task41__section']}>
					<SecondTitle text='Интервью идёт' />
					<div className={styles['task41__timer-block']}>
						{recordStage === 'answering' && (
							<span className={cn(styles['task41__timer'], { [styles['task41__timer_warning']]: answerSecondsLeft <= 10 })}>
								{answerSecondsLeft}
							</span>
						)}
						<div>
							<div className={styles['task41__stage-label']}>{stageLabel}</div>
							{recordStage === 'answering' && (
								<span className={styles['task41__timer-label']}>секунд на ответ</span>
							)}
						</div>
						<div className={styles['task41__recording-indicator']}>
							<div className={styles['task41__recording-dot']} />
							REC
						</div>
					</div>
				</div>
				<div className={styles['task41__buttons']}>
					<button className={styles['task41__stop-button']} onClick={() => doStopRecordingRef.current()}>
						Стоп и отправить
					</button>
				</div>
			</div>
		)
	}

	if (taskIsChecking || (phase === 'done' && !taskIsChecked)) {
		return (
			<div className={styles['task41']}>
				<CheckingLoader criteriaCount={5} stepDuration={15000} />
			</div>
		)
	}

	if (taskIsChecked && ctxResult) {
		return (
			<div className={styles['task41']}>
				{ctxResult.transcription && (
					<div className={styles['task41__section']}>
						<SecondTitle text='Транскрипция' />
						<div className={styles['task41__transcription']}>{ctxResult.transcription}</div>
					</div>
				)}
				<div className={styles['task41__results-section']}>
					<SecondTitle text='Оценки' />
					<div className={styles['task41__marks']}>
						<Criteria maxMark={1} criteriaNumber='К1' criteriaDescription='Ответ 1' value={ctxResult.k1} readonly />
						<Criteria maxMark={1} criteriaNumber='К2' criteriaDescription='Ответ 2' value={ctxResult.k2} readonly />
						<Criteria maxMark={1} criteriaNumber='К3' criteriaDescription='Ответ 3' value={ctxResult.k3} readonly />
						<Criteria maxMark={1} criteriaNumber='К4' criteriaDescription='Ответ 4' value={ctxResult.k4} readonly />
						<Criteria maxMark={1} criteriaNumber='К5' criteriaDescription='Ответ 5' value={ctxResult.k5} readonly />
						<AverageMark num={ctxResult.totalScore} />
					</div>
				</div>
				{ctxResult.feedback?.k1 && (
					<div className={styles['task41__feedback']}>
						<SecondTitle text='Обратная связь' />
						<div className={styles['task41__feedback-item']}>
							<p className={styles['task41__feedback-text']}>{ctxResult.feedback.k1.replace(/\*/g, '')}</p>
						</div>
					</div>
				)}
			</div>
		)
	}

	return null
}

export default Task41
