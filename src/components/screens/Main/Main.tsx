import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import DropDownList from '@/components/ui/DropDownList/DropDownList'
import MainTitle from '@/components/ui/MainTitle/MainTitle'
import TaskCard from '@/components/ui/TaskCard/TaskCard'
import Link from 'next/link'
import { FC } from 'react'
import CreatePencil from '../../../shared/images/CreatePencil.svg'
import styles from './Main.module.css'

const Main: FC = () => {
	return (
		<div className={styles['main']}>
			<div className={styles['main__content']}>
				<div className={styles['main__header']}>
					<MainTitle text='Все работы' />
					<DropDownList text='Недавнее' alt='Тип сортировки работ' />
				</div>
				<Link href='/create-work'>
					<ActiveButton
						text='Добавить работу'
						path={CreatePencil}
						alt='Добавить работу'
					/>
				</Link>
			</div>

			<div className={styles['main__content-cards']}>
				<TaskCard
					status={true}
					taskTitle='Задание 38.2'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='14.04'
				/>
				<TaskCard
					status={true}
					taskTitle='Задание 38.1'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='02.04'
				/>
				<TaskCard
					taskTitle='Задание 37'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='11.04'
				/>
				<TaskCard
					taskTitle='Задание 38.1'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='11.04'
				/>
				<TaskCard
					taskTitle='Задание 37'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='10.04'
				/>
				<TaskCard
					taskTitle='Задание 38.2'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='11.03'
				/>
				<TaskCard
					taskTitle='Задание 38.1'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='22.03'
				/>
				<TaskCard
					taskTitle='Задание 38.2'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='15.03'
				/>
				<TaskCard
					taskTitle='Задание 37'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='16.03'
				/>
				<TaskCard
					taskTitle='Задание 38.1'
					text='...I don"t think it will be a problem for me to choose a good job in the future as I"m really interested in foreign languages...'
					date='13.03'
				/>
			</div>
		</div>
	)
}

export default Main
