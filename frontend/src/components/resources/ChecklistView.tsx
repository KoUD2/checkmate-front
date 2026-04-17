'use client'

import { useState } from 'react'
import styles from './ChecklistView.module.css'

interface ChecklistItem {
  text: string
  hint?: string
}

interface ChecklistContent {
  items: ChecklistItem[]
}

interface Props {
  content: ChecklistContent
}

export default function ChecklistView({ content }: Props) {
  const [checked, setChecked] = useState<Record<number, boolean>>({})

  const toggle = (i: number) =>
    setChecked((prev) => ({ ...prev, [i]: !prev[i] }))

  const total = content.items.length
  const done = Object.values(checked).filter(Boolean).length

  return (
    <div className={styles.checklist}>
      <div className={styles.progress}>
        <div className={styles['progress-bar']}>
          <div
            className={styles['progress-fill']}
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>
        <span className={styles['progress-label']}>{done} / {total}</span>
      </div>
      <ul className={styles.list}>
        {content.items.map((item, i) => (
          <li
            key={i}
            className={`${styles.item} ${checked[i] ? styles.item_checked : ''}`}
            onClick={() => toggle(i)}
          >
            <span className={styles.checkbox}>
              {checked[i] && <span className={styles.check}>✓</span>}
            </span>
            <div className={styles.item_content}>
              <span className={styles.item_text}>{item.text}</span>
              {item.hint && <span className={styles.item_hint}>{item.hint}</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
