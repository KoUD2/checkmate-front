'use client'

import SecondTitle from '@/components/ui/SecondTitle/SecondTitle'
import { FC, useEffect, useState } from 'react'
import styles from './CheckingLoader.module.css'

interface Props {
	criteriaCount: number
	stepDuration?: number
}

const criteriaLabels: Record<number, string[]> = {
	3: ['К1', 'К2', 'К3'],
	5: ['К1', 'К2', 'К3', 'К4', 'К5'],
}

const CriteriaSkeleton: FC<{ maxMarks: number }> = ({ maxMarks }) => (
	<div className={styles['criteria-skeleton']}>
		<div className={`${styles['skeleton']} ${styles['sk-label']}`} />
		<div className={`${styles['skeleton']} ${styles['sk-desc']}`} />
		<div className={styles['sk-marks']}>
			{Array.from({ length: maxMarks }).map((_, i) => (
				<div key={i} className={`${styles['skeleton']} ${styles['sk-mark']}`} />
			))}
		</div>
	</div>
)

const FeedbackSkeleton: FC = () => (
	<div className={styles['feedback-item']}>
		<div className={`${styles['skeleton']} ${styles['sk-feedback-label']}`} />
		<div className={`${styles['skeleton']} ${styles['sk-line']} ${styles['sk-line-full']}`} />
		<div className={`${styles['skeleton']} ${styles['sk-line']} ${styles['sk-line-full']}`} />
		<div className={`${styles['skeleton']} ${styles['sk-line']} ${styles['sk-line-80']}`} />
		<div className={`${styles['skeleton']} ${styles['sk-line']} ${styles['sk-line-60']}`} />
	</div>
)

const CheckingLoader: FC<Props> = ({ criteriaCount, stepDuration = 9000 }) => {
	const [currentStep, setCurrentStep] = useState(1)
	const labels = criteriaLabels[criteriaCount] ?? Array.from({ length: criteriaCount }, (_, i) => `К${i + 1}`)
	const maxMarks = criteriaCount === 3 ? 2 : 3

	useEffect(() => {
		if (currentStep >= criteriaCount) return
		const timer = setTimeout(() => setCurrentStep(s => s + 1), stepDuration)
		return () => clearTimeout(timer)
	}, [currentStep, criteriaCount, stepDuration])

	return (
		<>
			<div className={styles['section']}>
				<SecondTitle text='Оценки' />
				<p className={styles['step']}>
					Проверяю {labels[currentStep - 1]} из {criteriaCount}...
				</p>
				<div className={styles['marks']}>
					{Array.from({ length: criteriaCount }).map((_, i) => (
						<CriteriaSkeleton key={i} maxMarks={maxMarks} />
					))}
					<div className={`${styles['skeleton']} ${styles['sk-average']}`} />
				</div>
			</div>

			<div className={styles['section']}>
				<SecondTitle text='Обратная связь' />
				<div className={styles['feedback']}>
					{Array.from({ length: criteriaCount }).map((_, i) => (
						<FeedbackSkeleton key={i} />
					))}
				</div>
			</div>
		</>
	)
}

export default CheckingLoader
