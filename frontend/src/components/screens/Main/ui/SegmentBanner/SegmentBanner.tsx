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
    <div className={styles.banner}>
      <span className={styles.text}>Кто вы?</span>
      {OPTIONS.map((o) => (
        <button key={o.value} className={styles.btn} disabled={saving} onClick={() => choose(o.value)}>
          {o.label}
        </button>
      ))}
      <button className={styles.skip} onClick={() => setDismissed(true)}>Позже</button>
    </div>
  )
}

export default SegmentBanner
