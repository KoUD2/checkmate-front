import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface IInput
	extends DetailedHTMLProps<
		HTMLAttributes<HTMLInputElement>,
		HTMLInputElement
	> {
	placeholder: string
	text?: string
	value: string
	onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
	disabled?: boolean
}
