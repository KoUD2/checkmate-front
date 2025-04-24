'use client'

import { submitEssay } from '@/api/essayService'
import { EssayFormData, Marks } from '@/api/types'
import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import AverageMark from '@/components/ui/AverageMark/AverageMark'
import ButtonNext from '@/components/ui/ButtonNext/ButtonNext'
import Criteria from '@/components/ui/Criteria/Criteria'
import Input from '@/components/ui/Input/Input'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import TextArea from '@/components/ui/TextArea/TextArea'
import cn from 'classnames'
import { FC, useState } from 'react'
import ReservedField from '../ui/ReservedField/ReservedField'
import styles from './Task37.module.css'

const initialMarks: Marks = { К1: '0', К2: '0', К3: '0' }

const Task37: FC = () => {
	const [formData, setFormData] = useState({
		subject: '',
		emailText: '',
		inlineInput: '',
		studentWork: '',
		studentWorkHtml: '',
	})

	const [errors, setErrors] = useState({
		subject: false,
		emailText: false,
		inlineInput: false,
		studentWork: false,
	})

	const handleInputChange = (field: keyof typeof errors, value: string) => {
		setErrors(prev => ({ ...prev, [field]: false }))
		setFormData(prev => ({ ...prev, [field]: value }))
	}

	const [isDisabled, setIsDisabled] = useState(false)
	const [isActive, setIsActive] = useState(false)
	const [submitting, setSubmitting] = useState(false)
	const [marks, setMarks] = useState<Marks>(initialMarks)
	const [comments, setComments] = useState<
		Array<{
			criterion: string
			text: string
			start_pos: number
			end_pos: number
		}>
	>([])

	const handleMarkChange = (criteriaId: string, mark: string) => {
		setMarks(prev => ({
			...prev,
			[criteriaId]: mark,
		}))
	}

	const total = Object.values(marks).reduce(
		(sum, mark) => sum + Number(mark),
		0
	)

	const handleNext = () => {
		const hasErrors = !Object.values(formData).every(val => val.trim() !== '')

		if (hasErrors) {
			setErrors({
				subject: formData.subject.trim() === '',
				emailText: formData.emailText.trim() === '',
				inlineInput: formData.inlineInput.trim() === '',
				studentWork: formData.studentWork.trim() === '',
			})
			return
		}

		setIsActive(true)
		setIsDisabled(true)
	}

	const handleBack = () => {
		setIsActive(false)
		setIsDisabled(false)
	}

	const handleCommentAdd = (comment: {
		criterion: string
		text: string
		start_pos: number
		end_pos: number
	}) => {
		setComments(prev => [...prev, comment])
	}

	const handleSubmit = async () => {
		setSubmitting(true)
		try {
			const dataToSubmit: EssayFormData = {
				comments,
				email: formData.emailText,
				essay: formData.studentWork,
				k1: parseInt(marks.К1, 10),
				k2: parseInt(marks.К2, 10),
				k3: parseInt(marks.К3, 10),
				questions_theme: formData.inlineInput,
				subject: formData.subject,
			}

			await submitEssay(dataToSubmit)
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<div className={styles['task37']}>
			<div className={styles['task37__task-fields']}>
				<div className={styles['task37__reserved-fields']}>
					<ReservedField text='From: Friend@mail.uk' />
					<ReservedField text='To: Russian_friend@ege.ru' />
				</div>
				<Input
					placeholder='Введите тему'
					text='Subject:'
					className={cn(styles['task37__input'], {
						[styles['task37__input_error']]: errors.subject,
					})}
					value={formData.subject}
					onChange={e => handleInputChange('subject', e.target.value)}
					disabled={isDisabled}
				/>
				<TextArea
					placeholder='Введите текст письма'
					className={cn(styles['task37__textarea'], {
						[styles['task37__textarea_error']]: errors.emailText,
					})}
					value={formData.emailText}
					onChange={value => handleInputChange('emailText', value)}
					readOnly={isDisabled}
				/>
				<div className={styles['task37__instructions']}>
					<p className={styles['task37__instruction-text']}>
						Write an email to Bill. In your message answer his questions, ask 3
						questions about{' '}
						<input
							type='text'
							className={cn(styles['task37__inline-input'], {
								[styles['task37__inline-input_error']]: errors.inlineInput,
							})}
							value={formData.inlineInput}
							onChange={e => handleInputChange('inlineInput', e.target.value)}
							placeholder='введите текст'
							disabled={isDisabled}
						/>
						. Write 100−140 words. Remember the rules of email writing.
					</p>
				</div>
			</div>
			<div className={styles['task37__task-fields']}>
				<SecondTitle text='Работа ученика' />
				<div className={styles['task37__student-work']}>
					{isActive ? (
						<TextArea
							isCommentable
							className={cn(
								styles['task37__textarea'],
								{ [styles['task37__textarea_error']]: errors.studentWork },
								{ [styles['task37__textarea_active']]: isActive }
							)}
							onCommentAdd={handleCommentAdd}
							value={formData.studentWork}
							htmlContent={formData.studentWorkHtml}
							readOnly={isDisabled}
						/>
					) : (
						<TextArea
							className={cn(styles['task37__textarea'], {
								[styles['task37__textarea_error']]: errors.studentWork,
							})}
							value={formData.studentWork}
							onChange={value => {
								handleInputChange('studentWork', value)
								setFormData(prev => ({
									...prev,
									studentWorkHtml: value.replace(/\n/g, '<br/>'),
								}))
							}}
							placeholder='Введите текст работы'
							readOnly={isDisabled}
						/>
					)}
				</div>
			</div>
			{isActive && (
				<div className={styles['task37__marks']}>
					<Criteria
						maxMark={2}
						criteriaNumber='К1'
						criteriaDescription='Решение коммуникативной задачи'
						onMarkChange={mark => handleMarkChange('К1', mark)}
					/>
					<Criteria
						maxMark={2}
						criteriaNumber='К2'
						criteriaDescription='Организация текста'
						onMarkChange={mark => handleMarkChange('К2', mark)}
					/>
					<Criteria
						maxMark={2}
						criteriaNumber='К3'
						criteriaDescription='Языковое оформление текста'
						onMarkChange={mark => handleMarkChange('К3', mark)}
					/>
					<AverageMark num={total} />
				</div>
			)}
			{isActive ? (
				<div className={styles['task37__buttons']}>
					<ButtonNext
						type='back'
						onClick={handleBack}
						className={styles['task37__button-back']}
					/>
					<ActiveButton
						text='Сохранить'
						disabled={submitting}
						onClick={handleSubmit}
						className={styles['task37__button-save']}
					/>
				</div>
			) : (
				<ButtonNext type='next' onClick={handleNext} />
			)}
		</div>
	)
}

export default Task37
