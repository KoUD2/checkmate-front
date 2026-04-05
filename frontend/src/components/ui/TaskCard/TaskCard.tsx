import Image from 'next/image'
import { JSX } from 'react'
import ApproveIcon from '../../../shared/images/ApproveIcon.svg'
import styles from './TaskCard.module.css'
import { ITaskCard } from './TaskCard.props'

const TaskCard = ({
	taskTitle,
	text,
	date,
	status,
	...props
}: ITaskCard): JSX.Element => {
	return (
		<div className={styles['task-card']} {...props}>
			<div className={styles['task-card__wrapper-name']}>
				<h2 className={styles['task-card__title']}>{taskTitle}</h2>
				{status && (
					<div className={styles['task-card__approved']}>
						<Image
							src={ApproveIcon}
							alt='Работа проверена'
							className={styles['task-card__approved-icon']}
						></Image>
					</div>
				)}
			</div>
			<p className={styles['task-card__text']}>{text}</p>
			<p className={styles['task-card__date']}>{date}</p>
		</div>
	)
}

export default TaskCard
