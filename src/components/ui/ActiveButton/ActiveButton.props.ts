import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface IActiveButton
	extends DetailedHTMLProps<
		HTMLAttributes<HTMLButtonElement>,
		HTMLButtonElement
	> {
	text: string
	path?: string
	alt?: string
	disabled?: boolean
	type?: 'submit' | 'reset' | 'button' | undefined
}
