import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface IReservedField
	extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	text: string
}
