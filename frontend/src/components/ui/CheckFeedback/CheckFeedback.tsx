'use client'

import { FC, useState } from 'react'
import api from '@/shared/utils/api'
import styles from './CheckFeedback.module.css'

interface Props {
	taskId: string
}

type State = 'idle' | 'disliked' | 'submitted'

const CheckFeedback: FC<Props> = ({ taskId }) => {
	const [state, setState] = useState<State>('idle')
	const [comment, setComment] = useState('')
	const [loading, setLoading] = useState(false)

	const submit = async (rating: 'LIKE' | 'DISLIKE', userComment?: string) => {
		setLoading(true)
		try {
			await api.patch(`/tasks/${taskId}/feedback`, { rating, comment: userComment })
		} catch {
			// silent — не блокируем UX
		} finally {
			setLoading(false)
			setState('submitted')
		}
	}

	if (state === 'submitted') {
		return (
			<div className={styles['feedback']}>
				<p className={styles['feedback__thanks']}>Спасибо за фидбек!</p>
			</div>
		)
	}

	if (state === 'disliked') {
		return (
			<div className={styles['feedback']}>
				<p className={styles['feedback__question']}>Что пошло не так?</p>
				<textarea
					className={styles['feedback__textarea']}
					placeholder='Необязательно, но поможет нам стать лучше'
					value={comment}
					onChange={e => setComment(e.target.value)}
					rows={3}
				/>
				<button
					className={styles['feedback__submit']}
					onClick={() => submit('DISLIKE', comment || undefined)}
					disabled={loading}
				>
					Отправить
				</button>
			</div>
		)
	}

	return (
		<div className={styles['feedback']}>
			<p className={styles['feedback__question']}>Полезна ли была проверка?</p>
			<div className={styles['feedback__buttons']}>
				<button
					className={styles['feedback__btn']}
					onClick={() => submit('LIKE')}
					disabled={loading}
					aria-label='Полезно'
				>
					👍
				</button>
				<button
					className={styles['feedback__btn']}
					onClick={() => setState('disliked')}
					disabled={loading}
					aria-label='Не полезно'
				>
					👎
				</button>
			</div>
		</div>
	)
}

export default CheckFeedback
