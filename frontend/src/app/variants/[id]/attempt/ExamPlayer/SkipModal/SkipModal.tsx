'use client'

import styles from '@/app/admin/task-bank/AdminTaskBank.module.css'

interface Props {
	section: 'WRITING' | 'SPEAKING'
	action: 'skip' | 'unskip'
	onConfirm: () => void
	onCancel: () => void
}

export default function SkipModal({ section, action, onConfirm, onCancel }: Props) {
	const isWriting = section === 'WRITING'
	const sectionLabel = isWriting ? 'Письмо' : 'Говорение'
	const taskRange = isWriting ? '37–38' : '39–42'
	const title = action === 'skip'
		? `Пропустить раздел «${sectionLabel}»?`
		: `Вернуть раздел «${sectionLabel}»?`
	const body = action === 'skip'
		? `Задания ${taskRange} не будут отправлены на проверку ИИ.`
		: `Задания ${taskRange} будут включены в отправку на проверку ИИ.`
	const confirmLabel = action === 'skip' ? 'Пропустить' : 'Вернуть'

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
						{confirmLabel}
					</button>
				</div>
			</div>
		</div>
	)
}
