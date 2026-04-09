import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface ITaskNumber
	extends DetailedHTMLProps<
		HTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> {
	text: '37' | '38.1' | '38.2' | '39'
	isActive: boolean
}
