import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface IButtonNext
	extends DetailedHTMLProps<
		HTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> {
	disabled?: boolean
	type: 'next' | 'back'
}
