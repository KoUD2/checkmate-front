import ButtonFile from '@/components/ui/ButtonFile/ButtonFile'
import ButtonNext from '@/components/ui/ButtonNext/ButtonNext'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import TextArea from '@/components/ui/TextArea/TextArea'
import cn from 'classnames'
import { FC } from 'react'
import styles from './Task38.module.css'

const Task38: FC = () => {
	const isActive = true

	return (
		<div className={styles['task38']}>
			<div className={styles['task38__instructions']}>
				<p className={styles['task38__instruction-text']}>
					Imagine that you are doing a project on{' '}
					<input
						type='text'
						className={styles['task38__inline-input']}
						placeholder='введите тему'
					/>
					. You have found some data on the subject — the results of the opinion
					polls (see the table below).
					<br />
					<br />
					Comment on the data in the table and give your opinion on the subject
					of the project.
				</p>
			</div>

			<ButtonFile />

			<div className={styles['task38__plan']}>
				<p className={styles['task38__plan-text']}>
					Write{' '}
					<span className={styles['task38__plan-text_isBold']}>
						200-250 words
					</span>
					.
					<br />
					Use the following plan:
				</p>
				<ul className={styles['task38__plan-list']}>
					<li className={styles['task38__plan-item']}>
						make an opening statement on the subject of the project;
					</li>
					<li className={styles['task38__plan-item']}>
						select and report 2-3 facts;
					</li>
					<li className={styles['task38__plan-item']}>
						make 1-2 comparisons where relevant and give your comments;
					</li>
					<li className={styles['task38__plan-item']}>
						outline a problem that{' '}
						<input
							type='text'
							className={styles['task38__inline-input']}
							placeholder='введите текст'
						/>{' '}
						and suggest a way of solving it;
					</li>
					<li className={styles['task38__plan-item']}>
						conclude by giving and explaining your opinion on{' '}
						<input
							type='text'
							className={styles['task38__inline-input']}
							placeholder='введите текст'
						/>
						.
					</li>
				</ul>
			</div>
			<div className={styles['task38__task-fields']}>
				<SecondTitle text='Работа ученика' />
				<div className={styles['task38__student-work']}>
					<div className={styles['task38__student-step']}>
						<div
							className={cn(styles['task38__step-icon'], {
								[styles['task38__step-icon_isActive']]: isActive,
							})}
						></div>
						<p className={styles['task38__step-text']}>Добавление работы</p>
					</div>
					<div className={styles['task38__student-step']}>
						<div className={styles['task38__step-icon']}></div>
						<p className={styles['task38__step-text']}>Проверка и оценка</p>
					</div>
				</div>
				<TextArea
					placeholder='Введите текст работы'
					className={styles['task38__textarea']}
					onChange={() => console.log(1)}
					value='1'
				/>
			</div>
			<ButtonNext type='next' />
		</div>
	)
}

export default Task38
