'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import MainTitle from '@/components/ui/MainTitle/MainTitle'
import TaskCard from '@/components/ui/TaskCard/TaskCard'
import { useTaskCheck } from '@/config/context/TaskCheckContext'
import api from '@/shared/utils/api'
import Link from 'next/link'
import { FC, useEffect, useRef, useState } from 'react'
import CreatePencil from '../../../shared/images/CreatePencil.svg'
import styles from './Main.module.css'

interface TaskItem {
	id: string
	type: 'TASK37' | 'TASK38' | 'TASK39'
	solution: string
	totalScore: number | null
	createdAt: string
}

const LIMIT = 12

const Main: FC = () => {
	const [tasks, setTasks] = useState<TaskItem[]>([])
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const { isChecking, isChecked, taskType } = useTaskCheck()
	const initialFetched = useRef(false)

	const fetchTasks = async (pageNum: number, append = false) => {
		try {
			const res = await api.get(`/tasks?page=${pageNum}&limit=${LIMIT}`)
			const data = res.data?.data
			const fetched: TaskItem[] = data?.tasks ?? []
			const total: number = data?.total ?? 0
			setTasks(prev => append ? [...prev, ...fetched] : fetched)
			setHasMore(pageNum * LIMIT < total)
		} catch {}
	}

	useEffect(() => {
		if (initialFetched.current) return
		initialFetched.current = true
		fetchTasks(1)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	useEffect(() => {
		if (isChecked) {
			setPage(1)
			fetchTasks(1)
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isChecked])

	const handleLoadMore = async () => {
		const next = page + 1
		setLoadingMore(true)
		await fetchTasks(next, true)
		setPage(next)
		setLoadingMore(false)
	}

	const formatDate = (iso: string) => {
		const d = new Date(iso)
		return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
	}

	const taskTitle = (type: TaskItem['type']) => {
		if (type === 'TASK37') return 'Задание 37'
		if (type === 'TASK38') return 'Задание 38'
		if (type === 'TASK39') return 'Задание 39'
		if (type === 'TASK40') return 'Задание 40'
		return type
	}

	return (
		<div className={styles['main']}>
			{isChecking && (
				<Link href='/create-work' style={{ textDecoration: 'none' }}>
					<div className={styles['main__checking-banner']}>
						<span>⏳</span>
						<span>Идёт проверка задания {taskType} — нажмите, чтобы вернуться</span>
					</div>
				</Link>
			)}
			<div className={styles['main__content']}>
				<div className={styles['main__header']}>
					<MainTitle text='Все работы' />
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
				{tasks.length === 0 && !isChecking ? (
					<div className={styles['main__empty']}>
						<span className={styles['main__empty-icon']}>📝</span>
						<p className={styles['main__empty-title']}>Работ пока нет</p>
						<p className={styles['main__empty-subtitle']}>Начните проверку, нажав «Добавить работу»</p>
					</div>
				) : (
					tasks.map(task => (
						<Link key={task.id} href={`/tasks/${task.id}`} style={{ display: 'contents' }}>
							<TaskCard
								status={task.totalScore !== null}
								taskTitle={taskTitle(task.type)}
								text={task.solution.slice(0, 120) + '...'}
								date={formatDate(task.createdAt)}
							/>
						</Link>
					))
				)}
			</div>

			{hasMore && (
				<button
					className={styles['main__load-more']}
					onClick={handleLoadMore}
					disabled={loadingMore}
				>
					{loadingMore ? 'Загружаю...' : 'Загрузить ещё'}
				</button>
			)}
		</div>
	)
}

export default Main
