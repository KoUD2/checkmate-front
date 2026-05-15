'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import variantsService, { VariantListItem } from '@/services/variants.service'
import sharedStyles from '../task-bank/AdminTaskBank.module.css'
import styles from './AdminVariants.module.css'

const formatDate = (iso: string): string => {
	const d = new Date(iso)
	return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
}

export default function AdminVariantsPage() {
	const [items, setItems] = useState<VariantListItem[]>([])
	const [page, setPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [total, setTotal] = useState(0)
	const [loading, setLoading] = useState(false)
	const [toggleBusyId, setToggleBusyId] = useState<string | null>(null)
	const [rowError, setRowError] = useState<{ id: string; msg: string } | null>(null)

	const fetchItems = async (overridePage?: number) => {
		setLoading(true)
		try {
			const result = await variantsService.adminList(overridePage ?? page)
			setItems(result.items)
			setTotal(result.total)
			setTotalPages(result.totalPages)
		} catch {
			setItems([])
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchItems()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [page])

	const handleTogglePublish = async (item: VariantListItem) => {
		setToggleBusyId(item.id)
		setRowError(null)
		// Optimistic update
		setItems((prev) =>
			prev.map((i) => (i.id === item.id ? { ...i, published: !item.published } : i))
		)
		try {
			const updated = await variantsService.adminUpdate(item.id, { published: !item.published })
			setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
		} catch {
			// Revert optimistic update
			setItems((prev) =>
				prev.map((i) => (i.id === item.id ? { ...i, published: item.published } : i))
			)
			setRowError({ id: item.id, msg: 'Ошибка при публикации — попробуйте снова' })
			setTimeout(() => setRowError(null), 3000)
		} finally {
			setToggleBusyId(null)
		}
	}

	return (
		<div className={sharedStyles.page}>
			<div className={sharedStyles.header}>
				<h1 className={sharedStyles.title}>Варианты ({total})</h1>
				<Link href="/admin/variants/new" className={sharedStyles.btn_create}>
					+ Создать вариант
				</Link>
			</div>

			<table className={sharedStyles.table} style={{ opacity: loading ? 0.6 : 1 }}>
				<thead>
					<tr>
						<th>Название</th>
						<th>Заданий</th>
						<th>Статус</th>
						<th>Создан</th>
						<th>Действия</th>
					</tr>
				</thead>
				<tbody>
					{items.map((item) => (
						<tr key={item.id}>
							<td>
								<Link
									href={`/admin/variants/${item.id}`}
									className={sharedStyles.titleLink}
								>
									{item.title}
								</Link>
							</td>
							<td>{item._count?.variantTasks ?? item.variantTasks?.length ?? 0}</td>
							<td>
								<span
									className={`${styles.statusBadge} ${
										item.published
											? styles.togglePublish_published
											: styles.togglePublish_draft
									}`}
								>
									{item.published ? 'Опубликован' : 'Черновик'}
								</span>
							</td>
							<td>{formatDate(item.createdAt)}</td>
							<td className={sharedStyles.actions}>
								<Link
									href={`/admin/variants/${item.id}`}
									className={sharedStyles.btn_edit}
								>
									Изменить
								</Link>
								<button
									className={`${styles.togglePublish} ${
										item.published
											? styles.togglePublish_published
											: styles.togglePublish_draft
									}`}
									disabled={toggleBusyId === item.id}
									onClick={() => handleTogglePublish(item)}
								>
									{item.published ? 'Снять с публикации' : 'Опубликовать'}
								</button>
								{rowError && rowError.id === item.id && (
									<span className={styles.rowError}>{rowError.msg}</span>
								)}
							</td>
						</tr>
					))}
					{items.length === 0 && (
						<tr>
							<td colSpan={5} className={sharedStyles.empty}>
								<div className={sharedStyles.emptyTitle}>Вариантов ещё нет</div>
								<div className={sharedStyles.emptySub}>
									Создайте первый вариант и добавьте задания из банка.
								</div>
							</td>
						</tr>
					)}
				</tbody>
			</table>

			{totalPages > 1 && (
				<div className={sharedStyles.pagination}>
					<button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
						←
					</button>
					<span>
						Стр. {page} / {totalPages}
					</span>
					<button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
						→
					</button>
				</div>
			)}
		</div>
	)
}
