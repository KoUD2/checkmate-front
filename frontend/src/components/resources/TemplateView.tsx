'use client'

import { useState } from 'react'
import styles from './TemplateView.module.css'

interface Phrase {
  label: string
  text: string
}

interface TemplateContent {
  body: string
  phrases: Phrase[]
}

interface Props {
  content: TemplateContent
}

export default function TemplateView({ content }: Props) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [copiedBody, setCopiedBody] = useState(false)

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1500)
    })
  }

  const copyBody = () => {
    navigator.clipboard.writeText(content.body).then(() => {
      setCopiedBody(true)
      setTimeout(() => setCopiedBody(false), 1500)
    })
  }

  return (
    <div className={styles.template}>
      {content.body && (
        <div className={styles.body_block}>
          <div className={styles.body_header}>
            <span className={styles.section_label}>Шаблон</span>
            <button className={styles.copy_btn} onClick={copyBody}>
              {copiedBody ? 'Скопировано!' : 'Копировать всё'}
            </button>
          </div>
          <pre className={styles.body}>{content.body}</pre>
        </div>
      )}

      {content.phrases && content.phrases.length > 0 && (
        <div className={styles.phrases}>
          <div className={styles.section_label}>Клише и фразы</div>
          <div className={styles.phrase_list}>
            {content.phrases.map((phrase, i) => (
              <div key={i} className={styles.phrase}>
                <div className={styles.phrase_inner}>
                  <span className={styles.phrase_label}>{phrase.label}</span>
                  <span className={styles.phrase_text}>{phrase.text}</span>
                </div>
                <button
                  className={styles.copy_btn}
                  onClick={() => copy(phrase.text, i)}
                >
                  {copiedIdx === i ? '✓' : 'Копировать'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
