'use client'

import api from '@/shared/utils/api'
import { FC, useEffect, useState } from 'react'
import styles from './AdminTasks.module.css'

interface AdminTask {
  id: string
  type: string
  totalScore: number | null
  createdAt: string
  user: { id: string; email: string; firstName: string; lastName: string }
}

interface AdminTaskDetail extends AdminTask {
  taskDescription: string
  solution: string
  imageBase64: string | null
  solutionImageBase64: string | null
  k1: number | null
  k2: number | null
  k3: number | null
  k4: number | null
  k5: number | null
  feedback: Record<string, string> | null
  transcription: string | null
}

const LIMIT = 20

const TASK_LABELS: Record<string, string> = {
  TASK37: 'Задание 37',
  TASK38: 'Задание 38',
  TASK39: 'Задание 39',
  TASK40: 'Задание 40',
  TASK41: 'Задание 41',
  TASK42: 'Задание 42',
}

const AdminTasks: FC = () => {
  const [tasks, setTasks] = useState<AdminTask[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selected, setSelected] = useState<AdminTaskDetail | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const fetchTasks = async (p: number) => {
    try {
      const res = await api.get(`/admin/tasks?page=${p}&limit=${LIMIT}`)
      const data = res.data?.data
      setTasks(data?.tasks ?? [])
      setTotalPages(data?.totalPages ?? 1)
      setTotal(data?.total ?? 0)
    } catch {}
  }

  useEffect(() => { fetchTasks(page) }, [page])

  const openTask = async (id: string) => {
    setLoadingId(id)
    try {
      const res = await api.get(`/admin/tasks/${id}`)
      setSelected(res.data?.data?.task ?? null)
    } catch {}
    setLoadingId(null)
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`
  }

  const scoreKeys = ['k1', 'k2', 'k3', 'k4', 'k5'] as const

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Задания ({total})</h1>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Тип</th>
            <th>Пользователь</th>
            <th>Email</th>
            <th>Оценка</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(t => (
            <tr key={t.id} onClick={() => openTask(t.id)} style={{ opacity: loadingId === t.id ? 0.5 : 1 }}>
              <td><span className={styles.taskId}>{t.id.slice(0, 8)}…</span></td>
              <td><span className={styles.badge}>{TASK_LABELS[t.type] ?? t.type}</span></td>
              <td>{t.user.firstName} {t.user.lastName}</td>
              <td>{t.user.email}</td>
              <td><span className={styles.score}>{t.totalScore !== null ? t.totalScore : '—'}</span></td>
              <td>{formatDate(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.pagination}>
        <button className={styles.pageBtn} onClick={() => setPage(p => p - 1)} disabled={page === 1}>←</button>
        <span className={styles.pageInfo}>Стр. {page} / {totalPages}</span>
        <button className={styles.pageBtn} onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>→</button>
      </div>

      {selected && (
        <div className={styles.overlay} onClick={() => setSelected(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <button className={styles.modalClose} onClick={() => setSelected(null)}>×</button>
            <div className={styles.modalTitle}>{TASK_LABELS[selected.type] ?? selected.type}</div>

            <div className={styles.modalMeta}>
              <div className={styles.modalMetaItem}><strong>ID:</strong> {selected.id}</div>
              <div className={styles.modalMetaItem}><strong>Дата:</strong> {formatDate(selected.createdAt)}</div>
              <div className={styles.modalMetaItem}><strong>Пользователь:</strong> {selected.user.firstName} {selected.user.lastName}</div>
              <div className={styles.modalMetaItem}><strong>Email:</strong> {selected.user.email}</div>
            </div>

            <div className={styles.modalScores}>
              {scoreKeys.map(k => selected[k] !== null && selected[k] !== undefined && (
                <span key={k} className={styles.scoreChip}>{k.toUpperCase()}: {selected[k]}</span>
              ))}
              <span className={`${styles.scoreChip} ${styles.scoreChipTotal}`}>
                Итого: {selected.totalScore ?? '—'}
              </span>
            </div>

            {selected.taskDescription && (
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Условие задания</div>
                <div className={styles.modalText}>{selected.taskDescription}</div>
              </div>
            )}

            {selected.imageBase64 && (
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>График / таблица</div>
                <img
                  src={`data:image/jpeg;base64,${selected.imageBase64}`}
                  alt="График задания"
                  className={styles.modalImage}
                />
              </div>
            )}

            {selected.transcription && (
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Транскрипция</div>
                <div className={styles.modalText}>{selected.transcription}</div>
              </div>
            )}

            {selected.solution && (
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Ответ ученика</div>
                <div className={styles.modalText}>{selected.solution}</div>
              </div>
            )}

            {selected.solutionImageBase64 && (
              <div className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Ответ ученика (фото)</div>
                <img
                  src={`data:image/jpeg;base64,${selected.solutionImageBase64}`}
                  alt="Ответ ученика"
                  className={styles.modalImage}
                />
              </div>
            )}

            {selected.feedback && Object.entries(selected.feedback).filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className={styles.modalSection}>
                <div className={styles.modalSectionTitle}>Фидбек {k.toUpperCase()}</div>
                <div className={styles.modalText}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTasks
