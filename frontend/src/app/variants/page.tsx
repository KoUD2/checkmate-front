'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import variantsService, { VariantListItem, ExamSection } from '@/services/variants.service'
import styles from './Variants.module.css'

const SECTION_CATALOG_LABEL: Record<ExamSection, string> = {
	LISTENING: 'Ауд',
	READING:   'Чт',
	GRAMMAR:   'Грам',
	WRITING:   'Пис',
	SPEAKING:  'Гов',
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

function getSectionBreakdown(variant: VariantListItem) {
	const counts: Partial<Record<ExamSection, number>> = {}
	let checkCost = 0
	for (const vt of variant.variantTasks ?? []) {
		const sec = vt.examTask.section
		counts[sec] = (counts[sec] ?? 0) + 1
		if (vt.examTask.format === 'AI_CHECK') checkCost++
	}
	return { counts, checkCost }
}

export default function VariantsCatalogPage() {
	const [items, setItems] = useState<VariantListItem[]>([])
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [loading, setLoading] = useState(true)

	const fetchItems = async (p: number) => {
		setLoading(true)
		try {
			const result = await variantsService.list(p)
			setItems(result.items)
			setTotalPages(result.totalPages)
		} catch {
			setItems([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchItems(page)
	}, [page])

	return (
		<div className={styles.page}>
			<div className={styles.container}>
				<h1 className={styles.title}>Варианты ЕГЭ</h1>
				<p className={styles.subtitle}>Полные варианты для практики экзамена</p>

				{loading ? (
					<div className={styles.grid}>
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} style={{ background: '#f3f4f6', borderRadius: 12, height: 160 }} />
						))}
					</div>
				) : items.length === 0 ? (
					<div className={styles.emptyState}>
						<div className={styles.emptyTitle}>Вариантов пока нет</div>
						<div>Мы скоро добавим варианты для практики.</div>
					</div>
				) : (
					<>
						<div className={styles.grid}>
							{items.map(variant => {
								const { counts, checkCost } = getSectionBreakdown(variant)
								return (
									<Link key={variant.id} href={`/variants/${variant.id}`} className={styles.card}>
										<div className={styles.cardTitle}>{variant.title}</div>
										<div className={styles.cardMeta}>
											{SECTION_ORDER.filter(sec => (counts[sec] ?? 0) > 0).map(sec => (
												<span key={sec} className={styles.sectionChip}>
													{SECTION_CATALOG_LABEL[sec]} {counts[sec]}
												</span>
											))}
											{checkCost > 0 && (
												<span className={styles.checkCost}>{pluralChecks(checkCost)}</span>
											)}
										</div>
									</Link>
								)
							})}
						</div>
						{totalPages > 1 && (
							<div className={styles.pagination}>
								<button disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
								<span>Стр. {page} / {totalPages}</span>
								<button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
