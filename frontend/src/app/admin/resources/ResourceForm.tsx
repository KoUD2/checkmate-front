'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import resourcesService, { Resource, ResourceType } from '@/services/resources.service'
import styles from './ResourceForm.module.css'

const TYPE_OPTIONS: { value: ResourceType; label: string }[] = [
  { value: 'ARTICLE', label: 'Статья' },
  { value: 'CHECKLIST', label: 'Чеклист' },
  { value: 'TRAINER', label: 'Тренажёр' },
  { value: 'TEMPLATE', label: 'Шаблоны' },
]

const CONTENT_PLACEHOLDERS: Record<ResourceType, string> = {
  ARTICLE: `{\n  "body": "<p>HTML-контент статьи</p>"\n}`,
  CHECKLIST: `{\n  "items": [\n    { "text": "Пункт 1", "hint": "Подсказка (необязательно)" },\n    { "text": "Пункт 2" }\n  ]\n}`,
  TRAINER: `{\n  "questions": [\n    {\n      "text": "Вопрос?",\n      "type": "choice",\n      "options": ["Вариант A", "Вариант B", "Вариант C"],\n      "answer": "Вариант A"\n    },\n    {\n      "text": "Вставьте слово: She ___ every day.",\n      "type": "fill",\n      "answer": "runs"\n    }\n  ]\n}`,
  TEMPLATE: `{\n  "body": "Текст шаблона письма/эссе...",\n  "phrases": [\n    { "label": "Начало", "text": "I am writing to..." },\n    { "label": "Вывод", "text": "In conclusion, I would like to say..." }\n  ]\n}`,
}

interface Props {
  initial?: Partial<Resource>
  resourceId?: string
}

export default function ResourceForm({ initial, resourceId }: Props) {
  const router = useRouter()
  const [form, setForm] = useState({
    slug: initial?.slug ?? '',
    type: (initial?.type ?? 'ARTICLE') as ResourceType,
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    content: initial?.content ? JSON.stringify(initial.content, null, 2) : '',
    published: initial?.published ?? false,
    seoTitle: initial?.seoTitle ?? '',
    seoDescription: initial?.seoDescription ?? '',
    seoKeywords: initial?.seoKeywords ?? '',
  })
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    let content: unknown
    try {
      content = JSON.parse(form.content)
    } catch {
      setError('Невалидный JSON в поле «Контент»')
      return
    }

    setSaving(true)
    try {
      const dto = {
        slug: form.slug,
        type: form.type,
        title: form.title,
        description: form.description,
        content,
        published: form.published,
        seoTitle: form.seoTitle || undefined,
        seoDescription: form.seoDescription || undefined,
        seoKeywords: form.seoKeywords || undefined,
      }
      if (resourceId) {
        await resourcesService.update(resourceId, dto)
      } else {
        await resourcesService.create(dto)
      }
      router.push('/admin/resources')
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Ошибка сохранения'
      setError(Array.isArray(msg) ? msg.join(', ') : msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.row}>
        <label className={styles.label}>
          Заголовок *
          <input
            className={styles.input}
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            required
            placeholder="Как использовать клише в эссе"
          />
        </label>
        <label className={styles.label}>
          Slug *
          <input
            className={styles.input}
            value={form.slug}
            onChange={(e) => set('slug', e.target.value)}
            required
            placeholder="kak-ispolzovat-klishe"
          />
        </label>
      </div>

      <label className={styles.label}>
        Тип *
        <select
          className={styles.select}
          value={form.type}
          onChange={(e) => set('type', e.target.value as ResourceType)}
        >
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>

      <label className={styles.label}>
        Краткое описание *
        <textarea
          className={styles.textarea}
          rows={2}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          required
          placeholder="Описание для карточки и SEO"
        />
      </label>

      <label className={styles.label}>
        Контент (JSON) *
        <textarea
          className={`${styles.textarea} ${styles.textarea_code}`}
          rows={12}
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          required
          placeholder={CONTENT_PLACEHOLDERS[form.type]}
        />
      </label>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>SEO</legend>
        <label className={styles.label}>
          SEO Title
          <input
            className={styles.input}
            value={form.seoTitle}
            onChange={(e) => set('seoTitle', e.target.value)}
            placeholder="Оставьте пустым — возьмём заголовок"
          />
        </label>
        <label className={styles.label}>
          SEO Description
          <textarea
            className={styles.textarea}
            rows={2}
            value={form.seoDescription}
            onChange={(e) => set('seoDescription', e.target.value)}
            placeholder="Оставьте пустым — возьмём краткое описание"
          />
        </label>
        <label className={styles.label}>
          Ключевые слова (через запятую)
          <input
            className={styles.input}
            value={form.seoKeywords}
            onChange={(e) => set('seoKeywords', e.target.value)}
            placeholder="ЕГЭ английский, клише эссе, задание 37"
          />
        </label>
      </fieldset>

      <label className={styles.checkbox_label}>
        <input
          type="checkbox"
          checked={form.published}
          onChange={(e) => set('published', e.target.checked)}
        />
        Опубликовать
      </label>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.footer}>
        <button type="submit" className={styles.btn_save} disabled={saving}>
          {saving ? 'Сохранение...' : resourceId ? 'Сохранить' : 'Создать'}
        </button>
        <button
          type="button"
          className={styles.btn_cancel}
          onClick={() => router.push('/admin/resources')}
        >
          Отмена
        </button>
      </div>
    </form>
  )
}
