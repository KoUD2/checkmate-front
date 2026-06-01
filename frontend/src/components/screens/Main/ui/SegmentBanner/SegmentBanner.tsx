'use client'

import { useAuth } from '@/hooks/useAuth'
import api from '@/shared/utils/api'
import { FC, useState } from 'react'
import styles from './SegmentBanner.module.css'

type Segment = 'TUTOR' | 'STUDENT' | 'PARENT'

const OPTIONS: { value: Segment; label: string }[] = [
  { value: 'TUTOR', label: 'Репетитор' },
  { value: 'STUDENT', label: 'Ученик' },
  { value: 'PARENT', label: 'Родитель' },
]

const SegmentBanner: FC = () => {
  const { user, refreshUser } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!user || user.segment != null || dismissed) return null

  const choose = async (segment: Segment) => {
    setSaving(true)
    try {
      await api.patch('/users/me/segment', { segment })
      await refreshUser()
    } catch {
      setSaving(false)
    }
  }

  return (
    <div className={styles.banner} role='dialog' aria-label='Кто вы?'>
      <div className={styles.lead}>
        <span className={styles.question}>Кто вы?</span>
        <span className={styles.subtitle}>Настроим CheckMate под вас</span>
      </div>

      <div className={styles.roles}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            className={styles.role}
            disabled={saving}
            onClick={() => choose(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className={styles.end}>
        <button className={styles.later} onClick={() => setDismissed(true)}>
          Позже
        </button>
        <button
          className={styles.close}
          aria-label='Закрыть'
          onClick={() => setDismissed(true)}
        >
          <svg
            viewBox='0 0 14 14'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
          >
            <path d='M2 2l10 10M12 2L2 12' />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default SegmentBanner
