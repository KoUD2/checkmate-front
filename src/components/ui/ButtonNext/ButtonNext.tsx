'use client'

import cn from 'classnames'
import Image from 'next/image'
import { JSX } from 'react'
import ButtonNextIcon from '../../../shared/images/ButtonNextIcon.svg'
import styles from './ButtonNext.module.css'
import { IButtonNext } from './ButtonNext.props'

const ButtonNext = ({
	type,
	className,
	...props
}: IButtonNext): JSX.Element => {
	return (
		<button className={cn(styles['button-next'], className)} {...props}>
			<Image
				src={ButtonNextIcon}
				alt={type === 'back' ? 'Назад' : 'Вперёд'}
				className={cn(styles['button-next__image'], {
					[styles['button-next__image_isBack']]: type === 'back',
				})}
			/>
		</button>
	)
}

export default ButtonNext
