import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface ITextArea
	extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	placeholder?: string
	className?: string
	isCommentable?: boolean
	criterion?: string
	htmlContent?: string
	onHtmlChange?: (html: string) => void
}
