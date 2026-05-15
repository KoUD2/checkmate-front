'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import attemptsService, { AttemptWithAnswers } from '@/services/attempts.service'
import variantsService, { VariantListItem } from '@/services/variants.service'
import ExamPlayer from './ExamPlayer/ExamPlayer'

export default function AttemptPage() {
	const { id } = useParams<{ id: string }>()
	const [attempt, setAttempt] = useState<AttemptWithAnswers | null>(null)
	const [variant, setVariant] = useState<VariantListItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		Promise.all([attemptsService.getOrCreate(id), variantsService.getById(id)])
			.then(([att, vrt]) => { setAttempt(att); setVariant(vrt) })
			.catch(() => setError('Вариант не найден'))
			.finally(() => setLoading(false))
	}, [id])

	if (loading) return <div style={{ padding: 32 }}>Загрузка…</div>
	if (error || !attempt || !variant) return <div style={{ padding: 32 }}>{error ?? 'Вариант не найден'}</div>
	return <ExamPlayer attempt={attempt} variant={variant} />
}
