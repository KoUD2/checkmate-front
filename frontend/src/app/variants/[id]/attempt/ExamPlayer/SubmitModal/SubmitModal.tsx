'use client'

import styles from '@/app/admin/task-bank/AdminTaskBank.module.css'

function pluralZadanij(n: number): string {
	const mod100 = n % 100
	const mod10 = n % 10
	if (mod100 >= 11 && mod100 <= 14) return 'заданий'
	if (mod10 === 1) return 'задание'
	if (mod10 >= 2 && mod10 <= 4) return 'задания'
	return 'заданий'
}

interface Props {
	unansweredCount: number
	onConfirm: () => void
	onCancel: () => void
}

export default function SubmitModal({ unansweredCount, onConfirm, onCancel }: Props) {
	const title = 'Завершить вариант?'
	const body = unansweredCount > 0
		? `У вас ${unansweredCount} неотвеченных ${pluralZadanij(unansweredCount)}. После отправки изменить ответы нельзя.`
		: 'Все задания отвечены. После отправки изменить ответы нельзя.'

	return (
		<div className={styles.overlay}>
			<div className={styles.modal} onClick={(e) => e.stopPropagation()}>
				<h2 className={styles.modalTitle}>{title}</h2>
				<p className={styles.modalBody}>{body}</p>
				<div className={styles.modalFooter}>
					<button type="button" className={styles.btn_secondary} onClick={onCancel}>
						Отмена
					</button>
					<button type="button" className={styles.btn_primary_dark} onClick={onConfirm}>
						Отправить
					</button>
				</div>
			</div>
		</div>
	)
}
