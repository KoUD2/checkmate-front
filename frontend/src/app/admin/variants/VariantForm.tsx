'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import variantsService, { CreateVariantPayload } from '@/services/variants.service'
import styles from './VariantForm.module.css'

export default function VariantForm() {
	const router = useRouter()
	const [form, setForm] = useState({ title: '', description: '' })
	const [submitting, setSubmitting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleChange = (field: 'title' | 'description', value: string) => {
		setForm((prev) => ({ ...prev, [field]: value }))
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (form.title.trim() === '') {
			setError('Введите название варианта')
			return
		}
		setSubmitting(true)
		setError(null)
		try {
			const dto: CreateVariantPayload = {
				title: form.title.trim(),
				description: form.description.trim() || undefined,
			}
			const result = await variantsService.adminCreate(dto)
			router.push('/admin/variants/' + result.id)
		} catch (err: unknown) {
			const msg =
				(err as { response?: { data?: { message?: string | string[] } } })?.response?.data
					?.message ?? 'Не удалось создать вариант. Попробуйте ещё раз.'
			setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<form className={styles.form} onSubmit={handleSubmit}>
			<div className={styles.fieldset}>
				<div>
					<label className={styles.label} htmlFor="vf-title">
						Название варианта *
					</label>
					<input
						id="vf-title"
						className={styles.input}
						type="text"
						required
						maxLength={200}
						value={form.title}
						onChange={(e) => handleChange('title', e.target.value)}
						placeholder="Введите название"
					/>
				</div>
				<div>
					<label className={styles.label} htmlFor="vf-description">
						Описание
					</label>
					<textarea
						id="vf-description"
						className={styles.textarea}
						maxLength={500}
						rows={4}
						value={form.description}
						onChange={(e) => handleChange('description', e.target.value)}
						placeholder="Необязательно"
					/>
				</div>
			</div>

			{error && <div className={styles.error}>{error}</div>}

			<div className={styles.footer}>
				<button type="submit" className={styles.btn_save} disabled={submitting}>
					{submitting ? <span className={styles.spinner} /> : 'Создать вариант'}
				</button>
				<Link href="/admin/variants" className={styles.btn_cancel}>
					Отмена
				</Link>
			</div>
		</form>
	)
}
