'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import variantsService, { VariantListItem, ExamSection } from '@/services/variants.service'
import styles from './VariantPreview.module.css'

const SECTION_PREVIEW_LABEL: Record<ExamSection, string> = {
	LISTENING: 'Аудирование',
	READING:   'Чтение',
	GRAMMAR:   'Грамматика и лексика',
	WRITING:   'Письмо',
	SPEAKING:  'Говорение',
}

const SECTION_ORDER: ExamSection[] = ['LISTENING', 'READING', 'GRAMMAR', 'WRITING', 'SPEAKING']

function pluralChecks(n: number): string {
	const mod10 = n % 10
	const mod100 = n % 100
	if (mod100 >= 11 && mod100 <= 14) return `${n} чеков`
	if (mod10 === 1) return `${n} чек`
	if (mod10 >= 2 && mod10 <= 4) return `${n} чека`
	return `${n} чеков`
}

export default function VariantPreviewPage() {
	const { id } = useParams<{ id: string }>()
	const [variant, setVariant] = useState<VariantListItem | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		variantsService.getById(id)
			.then(setVariant)
			.catch(() => setError('Вариант не найден'))
			.finally(() => setLoading(false))
	}, [id])

	if (loading) return <div className={styles.page}><p>Загрузка...</p></div>

	if (error || !variant) return (
		<div className={styles.page}>
			<Link href="/variants" className={styles.back}>← Варианты</Link>
			<p>{error ?? 'Вариант не найден'}</p>
		</div>
	)

	// Compute breakdown
	const counts: Partial<Record<ExamSection, number>> = {}
	let checkCost = 0
	for (const vt of variant.variantTasks ?? []) {
		counts[vt.examTask.section] = (counts[vt.examTask.section] ?? 0) + 1
		if (vt.examTask.format === 'AI_CHECK') checkCost++
	}

	const visibleSections = SECTION_ORDER.filter(sec => (counts[sec] ?? 0) > 0)

	return (
		<div className={styles.page}>
			<Link href="/variants" className={styles.back}>← Варианты</Link>
			<h1 className={styles.title}>{variant.title}</h1>
			{variant.description && <p className={styles.description}>{variant.description}</p>}

			<div className={styles.sectionList}>
				{visibleSections.map(sec => (
					<div key={sec} className={styles.sectionRow}>
						<span className={styles.sectionLabel}>{SECTION_PREVIEW_LABEL[sec]}</span>
						<span className={styles.sectionCount}>{counts[sec]} {(counts[sec] ?? 0) === 1 ? 'задание' : (counts[sec] ?? 0) >= 2 && (counts[sec] ?? 0) <= 4 ? 'задания' : 'заданий'}</span>
					</div>
				))}
			</div>

			{checkCost > 0 && (
				<div className={styles.costCallout}>
					Проверка письма и говорения: <span className={styles.costHighlight}>{pluralChecks(checkCost)}</span>
				</div>
			)}

			<Link href={`/variants/${variant.id}/attempt`} className={styles.btn_start}>
				Начать вариант
			</Link>
		</div>
	)
}
