'use client'

import Image from 'next/image'
import { FC } from 'react'
import ArrowDown from '../../../shared/images/ArrowDown.svg'
import styles from './DropDownList.module.css'

const DropDownList: FC<{ text: string; alt: string }> = ({ text, alt }) => {
	return (
		<button className={styles['dropdown-list']}>
			<h3 className={styles['dropdown-list__text']}>{text}</h3>
			<Image
				src={ArrowDown}
				alt={alt}
				className={styles['dropdown-list__arrow']}
			/>
		</button>
	)
}

export default DropDownList
