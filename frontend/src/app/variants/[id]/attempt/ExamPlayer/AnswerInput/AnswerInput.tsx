'use client'

import type { VariantTaskExamTaskMeta } from '@/services/variants.service'
import styles from './AnswerInput.module.css'

interface Props {
	task: VariantTaskExamTaskMeta
	value: unknown | null
	onChange: (content: unknown) => void
	disabled: boolean
}

export default function AnswerInput({ task, value, onChange, disabled }: Props) {
	switch (task.format) {
		case 'OPEN_CLOZE':
		case 'WORD_FORMATION':
		case 'AI_CHECK': {
			const rows = task.format === 'AI_CHECK' ? 10 : 3
			const placeholder = task.format === 'AI_CHECK' ? 'Введите развернутый ответ…' : 'Ответ'
			return (
				<textarea
					className={styles.answerTextarea}
					value={typeof value === 'string' ? value : ''}
					onChange={(e) => onChange(e.target.value)}
					disabled={disabled}
					rows={rows}
					placeholder={placeholder}
				/>
			)
		}

		case 'TRUE_FALSE':
			return (
				<div className={styles.trueFalseRow}>
					<button
						type="button"
						className={value === 'TRUE' ? styles.tfBtnSelected : styles.tfBtn}
						onClick={() => onChange('TRUE')}
						disabled={disabled}
					>
						TRUE
					</button>
					<button
						type="button"
						className={value === 'FALSE' ? styles.tfBtnSelected : styles.tfBtn}
						onClick={() => onChange('FALSE')}
						disabled={disabled}
					>
						FALSE
					</button>
				</div>
			)

		case 'MCQ': {
			if (!task.options || task.options.length === 0) {
				return <p style={{ color: '#6b7280' }}>Варианты не загружены</p>
			}
			return (
				<div>
					{task.options.map((opt) => (
						<button
							key={opt.optionText}
							type="button"
							className={value === opt.optionText ? styles.answerOptionSelected : styles.answerOption}
							onClick={() => onChange(opt.optionText)}
							disabled={disabled}
						>
							{opt.optionText}
						</button>
					))}
				</div>
			)
		}

		case 'MATCHING': {
			const matchOptions = Array.from(
				new Set(
					(task.options ?? [])
						.map((o) => o.matchText)
						.filter((m): m is string => Boolean(m)),
				),
			)
			return (
				<div>
					{(task.options ?? []).map((opt) => (
						<div key={opt.optionText} className={styles.matchRow}>
							<span className={styles.matchPrompt}>{opt.optionText}</span>
							<select
								className={styles.matchSelect}
								value={(value as Record<string, string> | null)?.[opt.optionText] ?? ''}
								onChange={(e) =>
									onChange({
										...((value as Record<string, string> | null) ?? {}),
										[opt.optionText]: e.target.value,
									})
								}
								disabled={disabled}
							>
								<option value="">—</option>
								{matchOptions.map((m) => (
									<option key={m} value={m}>
										{m}
									</option>
								))}
							</select>
						</div>
					))}
				</div>
			)
		}

		default:
			return <p style={{ color: '#6b7280' }}>Формат не поддерживается</p>
	}
}
