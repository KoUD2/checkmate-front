'use client'

import type { SaveState } from '@/services/attempts.service'
import styles from '../ExamPlayerSidebar.module.css'

interface Props {
	state: SaveState
	onRetry: () => void
}

export default function SaveIndicator({ state, onRetry }: Props) {
	if (state === 'idle') return null

	if (state === 'saving') {
		return (
			<>
				<span className={styles.spinner} aria-hidden="true" />
				Сохранение…
			</>
		)
	}

	if (state === 'saved') {
		return <>✓ Сохранено</>
	}

	// state === 'error'
	return (
		<span className={styles.saveError}>
			! Ошибка — <button type="button" className={styles.retryBtn} onClick={onRetry}>Повторить</button>
		</span>
	)
}
