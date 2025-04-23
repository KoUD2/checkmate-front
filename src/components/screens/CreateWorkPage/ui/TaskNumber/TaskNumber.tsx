import cn from 'classnames'
import Image from 'next/image'
import { JSX } from 'react'
import SelectedEx from '../../../../../shared/images/SelectedEx.svg'
import styles from './TaskNumber.module.css'
import { ITaskNumber } from './TaskNumber.props'

const TaskNumber = ({ text, isActive, ...props }: ITaskNumber): JSX.Element => {
	return (
		<button
			className={cn(styles['task-number'], {
				[styles['task-number_isActive']]: isActive,
			})}
			{...props}
		>
			<div
				className={cn(styles['task-number__wrapper-icon'], {
					[styles['task-number__wrapper-icon_isActive']]: isActive,
				})}
			>
				{isActive && (
					<Image
						src={SelectedEx}
						alt='Выбранный номер задания'
						className={styles['task-number__icon-image']}
					/>
				)}
			</div>
			<h3
				className={cn(styles['task-number__text'], {
					[styles['task-number__text_isActive']]: isActive,
				})}
			>
				{text}
			</h3>
		</button>
	)
}

export default TaskNumber
