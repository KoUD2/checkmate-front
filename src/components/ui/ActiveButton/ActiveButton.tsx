'use client'

import cn from 'classnames'
import Image from 'next/image'
import { JSX } from 'react'
import styles from './ActiveButton.module.css'
import { IActiveButton } from './ActiveButton.props'

const ActiveButton = ({
	text,
	path,
	alt,
	type,
	className,
	...props
}: IActiveButton): JSX.Element => {
	return (
		<button
			className={cn(styles['active-button'], className)}
			type={type}
			{...props}
		>
			{path && (
				<Image
					src={path}
					alt={alt || ''}
					className={styles['active-button__icon']}
				/>
			)}
			<h3 className={styles['active-button__text']}>{text}</h3>
		</button>
	)
}

export default ActiveButton
