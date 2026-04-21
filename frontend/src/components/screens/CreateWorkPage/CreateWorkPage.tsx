'use client'

import BackButton from '@/components/ui/BackButton/BackButton'
import MainTitle from '@/components/ui/MainTitle/MainTitle'
import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import { useTaskCheck } from '@/config/context/TaskCheckContext'
import { JSX, useState } from 'react'
import styles from './CreateWorkPage.module.css'
import TaskNumber from './ui/TaskNumber/TaskNumber'
import Task37 from './ui/task37/Task37/Task37'
import Task38 from './ui/task38/Task38/Task38'
import Task39 from './ui/task39/Task39/Task39'
import Task40 from './ui/task40/Task40/Task40'
import Task41 from './ui/task41/Task41/Task41'
import Task42 from './ui/task42/Task42/Task42'

const CreateWorkPage = (): JSX.Element => {
	const { taskType, isChecked: ctxChecked } = useTaskCheck()

	// Restore task type from context if there's an ongoing/completed check
	const initialTask = (taskType === '38.1' || taskType === '38.2' || taskType === '39' || taskType === '40' || taskType === '41' || taskType === '42') ? taskType : '37'
	const [task, setTask] = useState<string>(initialTask)
	const [isChecked, setIsChecked] = useState(ctxChecked)

	const handleTaskChange = (taskNumber: string) => {
		setTask(taskNumber)
	}

	return (
		<div className={styles['create-work-page']}>
			<BackButton />
			<div className={styles['create-work-page__content']}>
				<MainTitle text={isChecked ? 'Результат проверки' : 'Добавление работы'} />

				{!isChecked && (
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
							<TaskNumber
								text='39'
								isActive={task === '39'}
								onClick={() => handleTaskChange('39')}
							/>
							<TaskNumber
								text='40'
								isActive={task === '40'}
								onClick={() => handleTaskChange('40')}
							/>
							<TaskNumber
								text='41'
								isActive={task === '41'}
								onClick={() => handleTaskChange('41')}
							/>
							<TaskNumber
								text='42'
								isActive={task === '42'}
								onClick={() => handleTaskChange('42')}
							/>
						</div>
					</div>
				)}

				<div className={styles['create-work-page__section']}>
					<SecondTitle text='Условия задания' />
					{task === '37'
						? <Task37 onChecked={() => setIsChecked(true)} onReset={() => setIsChecked(false)} />
						: task === '39'
						? <Task39 onChecked={() => setIsChecked(true)} onReset={() => setIsChecked(false)} />
						: task === '40'
						? <Task40 onChecked={() => setIsChecked(true)} onReset={() => setIsChecked(false)} />
						: task === '41'
						? <Task41 onChecked={() => setIsChecked(true)} onReset={() => setIsChecked(false)} />
						: task === '42'
						? <Task42 onChecked={() => setIsChecked(true)} onReset={() => setIsChecked(false)} />
						: <Task38 onChecked={() => setIsChecked(true)} onReset={() => setIsChecked(false)} />
					}
				</div>
			</div>
		</div>
	)
}

export default CreateWorkPage
