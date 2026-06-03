'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useRef, useState } from 'react'
import styles from './ChurnSurveyBanner.module.css'

// Backend enum (CancelReason) — keep values in sync with prisma schema / DTO.
type CancelReason =
	| 'PRICE'
	| 'NO_NEED_NOW'
	| 'MISSING_FEATURES'
	| 'QUALITY'
	| 'TECH_ISSUES'
	| 'SWITCHED'
	| 'OTHER'

const REASONS: { id: CancelReason; label: string }[] = [
	{ id: 'PRICE', label: 'Дорого' },
	{ id: 'NO_NEED_NOW', label: 'Не нужно сейчас / сезон закончился' },
	{ id: 'MISSING_FEATURES', label: 'Не хватает функций' },
	{ id: 'QUALITY', label: 'Качество проверки не устроило' },
	{ id: 'TECH_ISSUES', label: 'Технические проблемы' },
	{ id: 'SWITCHED', label: 'Ушёл к конкуренту' },
	{ id: 'OTHER', label: 'Другое' },
]

const MAX = 500

const CloseIcon = () => (
	<svg viewBox='0 0 14 14' fill='none'>
		<path
			d='M1.5 1.5l11 11M12.5 1.5l-11 11'
			stroke='currentColor'
			strokeWidth='1.7'
			strokeLinecap='round'
		/>
	</svg>
)

const SealIcon = () => (
	<svg viewBox='0 0 24 24' fill='none'>
		<path
			d='M12 2.6l2.2 1.9 2.9-.2.9 2.8 2.4 1.6-.9 2.8.9 2.8-2.4 1.6-.9 2.8-2.9-.2L12 21.4l-2.2-1.9-2.9.2-.9-2.8-2.4-1.6.9-2.8-.9-2.8 2.4-1.6.9-2.8 2.9.2L12 2.6z'
			fill='#eb5931'
		/>
		<path
			d='M8.6 12.2l2.2 2.1 4.4-4.4'
			stroke='#fff'
			strokeWidth='1.7'
			strokeLinecap='round'
			strokeLinejoin='round'
		/>
	</svg>
)

interface ChurnSurveyBannerProps {
	onDone: () => void
}

const ChurnSurveyBanner: FC<ChurnSurveyBannerProps> = ({ onDone }) => {
	const [phase, setPhase] = useState<'base' | 'busy' | 'done'>('base')
	const [reason, setReason] = useState<CancelReason | null>(null)
	const [other, setOther] = useState('')
	const taRef = useRef<HTMLTextAreaElement>(null)

	const busy = phase === 'busy'
	const isOther = reason === 'OTHER'

	useEffect(() => {
		if (isOther && phase === 'base') taRef.current?.focus()
	}, [isOther, phase])

	const send = async () => {
		if (!reason || busy) return
		setPhase('busy')
		const comment = isOther ? other.trim() : ''
		try {
			await api.post('/users/me/cancel-feedback', {
				reason,
				...(comment ? { comment } : {}),
			})
			setPhase('done')
			setTimeout(onDone, 1800)
		} catch {
			setPhase('base')
		}
	}

	if (phase === 'done') {
		return (
			<div className={styles.banner} role='status' aria-live='polite'>
				<div className={styles.done}>
					<div className={styles.doneIco}>
						<svg viewBox='0 0 24 16' fill='none'>
							<path
								d='M22 2L8.5 15 2 8.8'
								stroke='#2acc3a'
								strokeWidth='2.6'
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
					</div>
					<p className={styles.doneTitle}>Спасибо за отзыв!</p>
					<p className={styles.doneSub}>
						Мы прочитаем каждый ответ — это помогает нам делать Checkmate лучше.
					</p>
				</div>
			</div>
		)
	}

	return (
		<div
			className={styles.banner}
			role='dialog'
			aria-label='Обратная связь по подписке'
		>
			<div className={styles.pad}>
				<div className={styles.head}>
					<div className={styles.seal}>
						<SealIcon />
					</div>
					<div className={styles.htext}>
						<h2 className={styles.title}>Подскажете, почему не продлили подписку?</h2>
						<p className={styles.sub}>
							Один ответ — и вы поможете нам стать лучше. Это займёт пару секунд.
						</p>
					</div>
					<button
						className={styles.close}
						aria-label='Закрыть'
						onClick={onDone}
						disabled={busy}
					>
						<CloseIcon />
					</button>
				</div>

				<div className={styles.chips}>
					{REASONS.map(r => (
						<button
							key={r.id}
							className={`${styles.chip}${reason === r.id ? ` ${styles.chipSel}` : ''}`}
							disabled={busy}
							onClick={() => setReason(r.id)}
						>
							{r.label}
						</button>
					))}
				</div>

				{isOther && (
					<div className={styles.other}>
						<textarea
							ref={taRef}
							className={styles.ta}
							maxLength={MAX}
							placeholder='Расскажите подробнее — что нам стоит улучшить? (необязательно)'
							value={other}
							disabled={busy}
							onChange={e => setOther(e.target.value.slice(0, MAX))}
						/>
						<div className={`${styles.count}${other.length >= MAX ? ` ${styles.countMax}` : ''}`}>
							{other.length} / {MAX}
						</div>
					</div>
				)}

				<div className={styles.foot}>
					<button className={styles.later} onClick={onDone} disabled={busy}>
						Позже
					</button>
					<button className={styles.send} disabled={!reason || busy} onClick={send}>
						{busy ? (
							<>
								<span className={styles.spin} /> Отправляю…
							</>
						) : (
							'Отправить'
						)}
					</button>
				</div>
			</div>
		</div>
	)
}

export default ChurnSurveyBanner
