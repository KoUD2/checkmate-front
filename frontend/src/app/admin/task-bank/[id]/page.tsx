'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ExamTaskForm from '../ExamTaskForm'
import examTasksService, { ExamTask } from '@/services/exam-tasks.service'

export default function EditExamTaskPage() {
	const { id } = useParams<{ id: string }>()
	const [task, setTask] = useState<ExamTask | null>(null)
	const [notFound, setNotFound] = useState(false)

	useEffect(() => {
		examTasksService.getById(id).then(setTask).catch(() => setNotFound(true))
	}, [id])

	if (notFound) {
		return (
			<div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 40 }}>
				<p style={{ color: '#6b7280', fontSize: 14 }}>Задание не найдено</p>
				<Link
					href="/admin/task-bank"
					style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}
				>
					← Банк заданий
				</Link>
			</div>
		)
	}

	if (task === null) return null

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
				<Link
					href="/admin/task-bank"
					style={{ fontSize: 13, color: '#6b7280', textDecoration: 'none' }}
				>
					← Банк заданий
				</Link>
				<h1 style={{ fontSize: 24, fontWeight: 700, color: '#111827', margin: 0 }}>
					Редактировать задание
				</h1>
			</div>
			<ExamTaskForm initial={task} taskId={id} />
		</div>
	)
}
