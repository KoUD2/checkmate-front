'use client'

import referralService, { ReferralStats } from '@/services/referral.service'
import { FC, useEffect, useState } from 'react'
import styles from './SubscribePage.module.css'

const ReferralSection: FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    referralService
      .getMyStats()
      .then(setStats)
      .catch(() => setError(true))
  }, [])

  const handleCopy = () => {
    if (!stats?.referralLink) return
    navigator.clipboard.writeText(stats.referralLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (error) return null

  return (
    <div className={styles['promo-section']}>
      <div className={styles['promo-title']}>Реферальная программа</div>

      {stats ? (
        <>
          <div className={styles['promo-row']}>
            <input
              className={styles['promo-input']}
              readOnly
              value={stats.referralLink ?? ''}
              onFocus={(e) => e.target.select()}
            />
            <button className={styles['promo-button']} onClick={handleCopy}>
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.417vw' }}>
            <div className={styles.status}>
              Зарегистрировалось:{' '}
              <span className={styles.status__value}>{stats.totalReferrals}</span>
            </div>
            <div className={styles.status}>
              Оплатили:{' '}
              <span className={styles.status__value}>{stats.payingReferrals}</span>
            </div>
            <div className={styles.status}>
              Заработано проверок:{' '}
              <span className={styles.status__value}>{stats.totalChecksEarned}</span>
            </div>
            {stats.nextMilestone !== null && stats.nextMilestoneBonus !== null && (
              <div className={styles.status}>
                До следующего бонуса:{' '}
                <span className={styles.status__value}>
                  ещё {stats.nextMilestone}{' '}
                  {stats.nextMilestone === 1 ? 'друг' : stats.nextMilestone < 5 ? 'друга' : 'друзей'}{' '}
                  → +{stats.nextMilestoneBonus} проверок
                </span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className={styles.status}>Загрузка...</div>
      )}
    </div>
  )
}

export default ReferralSection
