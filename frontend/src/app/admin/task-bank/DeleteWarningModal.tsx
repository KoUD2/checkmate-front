'use client'

import styles from './AdminTaskBank.module.css'

interface Props {
	mode: 'draft' | 'blocked'
	variantNames: string[]
	onConfirm?: () => void
	onClose: () => void
	errorMessage?: string | null
}

export default function DeleteWarningModal({ mode, variantNames, onConfirm, onClose, errorMessage }: Props) {
	const handleOverlayClick = () => {
		if (mode === 'blocked') {
			onClose()
		}
	}

	if (mode === 'draft') {
		return (
			<div className={styles.overlay} onClick={handleOverlayClick}>
				<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
					<h2 className={styles.modalTitle}>Задание используется в черновиках</h2>
					<p className={styles.modalBody}>
						Это задание входит в следующие неопубликованные варианты: {variantNames.join(', ')}. При удалении задание будет автоматически убрано из этих вариантов.
					</p>
					{errorMessage && (
						<p style={{ color: '#dc2626', fontSize: 14, margin: '0 0 12px' }}>{errorMessage}</p>
					)}
					<div className={styles.modalFooter}>
						<button
							className={styles.btn_destructive}
							onClick={() => {
								if (onConfirm) onConfirm()
							}}
						>
							Удалить всё равно
						</button>
						<button className={styles.btn_secondary} onClick={onClose}>
							Не удалять
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className={styles.overlay} onClick={handleOverlayClick}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<h2 className={styles.modalTitle}>Удаление невозможно</h2>
				<p className={styles.modalBody}>
					Задание входит в опубликованные варианты: {variantNames.join(', ')}. Снимите вариант с публикации, прежде чем удалять задание.
				</p>
				<div className={styles.modalFooter}>
					<button className={styles.btn_primary_dark} onClick={onClose}>
						Понятно
					</button>
				</div>
			</div>
		</div>
	)
}
