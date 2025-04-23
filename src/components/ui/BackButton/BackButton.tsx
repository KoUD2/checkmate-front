'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import BackIcon from '../../../shared/images/BackIcon.svg'
import styles from './BackButton.module.css'

const BackButton = () => {
	const router = useRouter()

	const handleBack = () => {
		router.back()
	}

	return (
		<button className={styles['back-button']} onClick={handleBack}>
			<Image
				src={BackIcon}
				alt='Переход назад'
				className={styles['back-button__icon']}
			/>
			Назад
		</button>
	)
}

export default BackButton
