'use client'

import cn from 'classnames'
import { JSX } from 'react'
import styles from './Input.module.css'
import { IInput } from './Input.props'

const Input = ({
	placeholder,
	text,
	className,
	...props
}: IInput): JSX.Element => {
	return (
		<div className={styles['input']}>
			{text && <p className={styles['input__text']}>{text}</p>}
			<input
				className={cn(styles['input__field'], className)}
				type='text'
				placeholder={placeholder}
				{...props}
			/>
		</div>
	)
}

export default Input
