'use client'

import cn from 'classnames'
import { FC, useEffect, useRef } from 'react'
import styles from './TextArea.module.css'

interface ITextArea {
	value: string
	onChange?: (value: string) => void
	className?: string
	placeholder?: string
	readOnly?: boolean
	isCommentable?: boolean
	htmlContent?: string
}

const TextArea: FC<ITextArea> = ({
	value,
	onChange,
	className,
	placeholder,
	readOnly,
	isCommentable,
	htmlContent,
}) => {
	const textAreaRef = useRef<HTMLTextAreaElement>(null)
	const divRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		if (isCommentable && divRef.current) {
			divRef.current.innerHTML = htmlContent || value.replace(/\n/g, '<br/>')
		}
	}, [isCommentable, htmlContent, value])

	if (isCommentable) {
		return (
			<div
				ref={divRef}
				className={cn(styles['textarea'], className)}
				dangerouslySetInnerHTML={{ __html: htmlContent || value }}
			/>
		)
	}

	return (
		<textarea
			ref={textAreaRef}
			className={cn(styles['textarea'], className)}
			value={value}
			onChange={e => onChange?.(e.target.value)}
			placeholder={placeholder}
			readOnly={readOnly}
		/>
	)
}

export default TextArea
