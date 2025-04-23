'use client'

import { useAuth } from '@/hooks/useAuth'
import Image from 'next/image'
import Link from 'next/link'
import { FC } from 'react'
import Logo from '../../../shared/images/Logo.svg'
import styles from './MainLayout.module.css'

function getInitials(name: string | undefined): string {
	if (!name) return ''
	const words = name.trim().split(' ')
	if (words.length === 1) {
		return words[0][0]?.toUpperCase() || ''
	}
	return (words[0][0] + words[1][0]).toUpperCase()
}

const MainLayout: FC = () => {
	const { user } = useAuth()

	return (
		<header className={styles['main-layout']}>
			<Link href='/'>
				<div className={styles['main-layout__logo-container']}>
					<Image
						src={Logo}
						alt='Логотип'
						className={styles['main-layout__logo']}
					/>
					<h2 className={styles['main-layout__title']}>Checkmate</h2>
				</div>
			</Link>
			<div className={styles['main-layout__greeting']}>
				{user ? getInitials(user.name) : ''}
			</div>
		</header>
	)
}

export default MainLayout
