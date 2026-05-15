'use client'

import Link from 'next/link'
import ExamTaskForm from '../ExamTaskForm'

export default function NewExamTaskPage() {
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
					Новое задание
				</h1>
			</div>
			<ExamTaskForm />
		</div>
	)
}
