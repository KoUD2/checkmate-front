'use client'

import BackButton from '@/components/ui/BackButton/BackButton'
import MainTitle from '@/components/ui/MainTitle/MainTitle'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import { JSX, useState } from 'react'
import styles from './CreateWorkPage.module.css'
import TaskNumber from './ui/TaskNumber/TaskNumber'
import Task37 from './ui/task37/Task37/Task37'
import Task38 from './ui/task38/Task38/Task38'

const CreateWorkPage = (): JSX.Element => {
	const [task, setTask] = useState<string>('37')

	const handleTaskChange = (taskNumber: string) => {
		setTask(taskNumber)
	}

	return (
		<div className={styles['create-work-page']}>
			<BackButton />
			<div className={styles['create-work-page__content']}>
				<MainTitle text='Добавление работы' />
				<div className={styles['create-work-page__section']}>
					<SecondTitle text='Тип задания' />
					<div className={styles['create-work-page__task-types']}>
						<TaskNumber
							text='37'
							isActive={task === '37'}
							onClick={() => handleTaskChange('37')}
						/>
						<TaskNumber
							text='38.1'
							isActive={task === '38.1'}
							onClick={() => handleTaskChange('38.1')}
						/>
						<TaskNumber
							text='38.2'
							isActive={task === '38.2'}
							onClick={() => handleTaskChange('38.2')}
						/>
					</div>
				</div>
				<div className={styles['create-work-page__section']}>
					<SecondTitle text='Условия задания' />
					{task === '37' ? <Task37 /> : <Task38 />}
				</div>
			</div>
		</div>
	)
}

export default CreateWorkPage
