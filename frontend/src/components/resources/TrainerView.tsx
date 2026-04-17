'use client'

import { useState } from 'react'
import styles from './TrainerView.module.css'

interface Question {
  text: string
  type: 'choice' | 'fill'
  options?: string[]
  answer: string
}

interface TrainerContent {
  questions: Question[]
}

interface Props {
  content: TrainerContent
}

export default function TrainerView({ content }: Props) {
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [fillValue, setFillValue] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)

  const questions = content.questions
  const q = questions[current]

  const isCorrect = (answer: string) =>
    answer.trim().toLowerCase() === q.answer.trim().toLowerCase()

  const handleChoice = (opt: string) => {
    if (revealed) return
    setSelected(opt)
    setRevealed(true)
    if (isCorrect(opt)) setScore((s) => s + 1)
  }

  const handleFillSubmit = () => {
    if (revealed || !fillValue.trim()) return
    setRevealed(true)
    if (isCorrect(fillValue)) setScore((s) => s + 1)
  }

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setFinished(true)
    } else {
      setCurrent((c) => c + 1)
      setSelected(null)
      setFillValue('')
      setRevealed(false)
    }
  }

  const handleRestart = () => {
    setCurrent(0)
    setSelected(null)
    setFillValue('')
    setRevealed(false)
    setScore(0)
    setFinished(false)
  }

  if (finished) {
    return (
      <div className={styles.result}>
        <div className={styles.result_score}>
          {score} / {questions.length}
        </div>
        <div className={styles.result_label}>
          {score === questions.length
            ? 'Отлично! Все правильно!'
            : score >= questions.length / 2
            ? 'Хороший результат!'
            : 'Нужно повторить!'}
        </div>
        <button className={styles.btn} onClick={handleRestart}>
          Пройти ещё раз
        </button>
      </div>
    )
  }

  return (
    <div className={styles.trainer}>
      <div className={styles.meta}>
        <span className={styles.counter}>
          {current + 1} / {questions.length}
        </span>
        <span className={styles.score_inline}>Баллы: {score}</span>
      </div>

      <div className={styles.question}>{q.text}</div>

      {q.type === 'choice' && q.options && (
        <div className={styles.options}>
          {q.options.map((opt) => {
            let cls = styles.option
            if (revealed) {
              if (isCorrect(opt)) cls += ` ${styles.option_correct}`
              else if (opt === selected && !isCorrect(opt)) cls += ` ${styles.option_wrong}`
            } else if (opt === selected) {
              cls += ` ${styles.option_selected}`
            }
            return (
              <button key={opt} className={cls} onClick={() => handleChoice(opt)}>
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {q.type === 'fill' && (
        <div className={styles.fill}>
          <input
            className={`${styles.fill_input} ${
              revealed
                ? isCorrect(fillValue)
                  ? styles.fill_correct
                  : styles.fill_wrong
                : ''
            }`}
            value={fillValue}
            onChange={(e) => setFillValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFillSubmit()}
            placeholder="Введите ответ..."
            disabled={revealed}
          />
          {!revealed && (
            <button className={styles.btn} onClick={handleFillSubmit}>
              Проверить
            </button>
          )}
          {revealed && !isCorrect(fillValue) && (
            <div className={styles.correct_answer}>
              Правильный ответ: <strong>{q.answer}</strong>
            </div>
          )}
        </div>
      )}

      {revealed && (
        <button className={`${styles.btn} ${styles.btn_next}`} onClick={handleNext}>
          {current + 1 >= questions.length ? 'Завершить' : 'Следующий →'}
        </button>
      )}
    </div>
  )
}
