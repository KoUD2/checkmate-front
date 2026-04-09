'use client'

import referralService, { ReferralStats } from '@/services/referral.service'
import { FC, useEffect, useState } from 'react'
import styles from './ReferralPage.module.css'

const MILESTONES = [
  { count: 1, bonus: 5 },
  { count: 3, bonus: 10 },
  { count: 7, bonus: 20 },
  { count: 15, bonus: 40 },
  { count: 30, bonus: 75 },
  { count: 50, bonus: 100 },
]

const ReferralPage: FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    referralService
      .getMyStats()
      .then(setStats)
      .finally(() => setLoading(false))
  }, [])

  const handleCopy = () => {
    if (!stats?.referralLink) return
    navigator.clipboard.writeText(stats.referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const payingReferrals = stats?.payingReferrals ?? 0

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Реферальная программа</h1>
        <p className={styles.subtitle}>
          Пригласите друга. Когда он купит любой пакет — вы получите бонусные проверки.
        </p>

        {/* Referral link */}
        <div className={styles.section}>
          <div className={styles['section-title']}>Ваша ссылка</div>
          {loading ? (
            <div className={styles.placeholder}>Загрузка...</div>
          ) : (
            <div className={styles['link-row']}>
              <input
                className={styles['link-input']}
                readOnly
                value={stats?.referralLink ?? ''}
                onFocus={(e) => e.target.select()}
              />
              <button className={styles['copy-button']} onClick={handleCopy}>
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className={styles.section}>
          <div className={styles['section-title']}>Статистика</div>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.stat__value}>{stats?.totalReferrals ?? 0}</div>
              <div className={styles.stat__label}>зарегистрировалось</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.stat__value}>{stats?.payingReferrals ?? 0}</div>
              <div className={styles.stat__label}>оплатили</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.stat__value}>{stats?.totalChecksEarned ?? 0}</div>
              <div className={styles.stat__label}>проверок заработано</div>
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className={styles.section}>
          <div className={styles['section-title']}>Милестоуны</div>
          <div className={styles.milestones}>
            {MILESTONES.map((m) => {
              const reached = payingReferrals >= m.count
              const isCurrent =
                payingReferrals < m.count &&
                (MILESTONES.findIndex((x) => x.count === m.count) === 0 ||
                  payingReferrals >= MILESTONES[MILESTONES.findIndex((x) => x.count === m.count) - 1].count)
              return (
                <div
                  key={m.count}
                  className={`${styles.milestone} ${reached ? styles.milestone_reached : ''} ${isCurrent ? styles.milestone_current : ''}`}
                >
                  <div className={styles.milestone__count}>{m.count} {m.count === 1 ? 'друг' : m.count < 5 ? 'друга' : 'друзей'}</div>
                  <div className={styles.milestone__bonus}>+{m.bonus} проверок</div>
                  {reached && <div className={styles.milestone__check}>✓</div>}
                </div>
              )
            })}
            <div className={`${styles.milestone} ${payingReferrals > 50 ? styles.milestone_reached : ''}`}>
              <div className={styles.milestone__count}>50+ друзей</div>
              <div className={styles.milestone__bonus}>+5 за каждого</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ReferralPage
