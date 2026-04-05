import { FC } from 'react'
import styles from './AverageMark.module.css'

const getDeclension = (num: number): string => {
	const lastDigit = num % 10

	if (lastDigit === 1) {
		return 'балл'
	}

	if (lastDigit >= 2 && lastDigit <= 4) {
		return 'балла'
	}

	return 'баллов'
}

const AverageMark: FC<{ num: number }> = ({ num }) => {
	const declension = getDeclension(num)

	return (
		<div className={styles['average-mark']}>
			<p className={styles['average-mark__text']}>
				{num} {declension}
			</p>
		</div>
	)
}

export default AverageMark
