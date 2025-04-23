import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface ICriteria
	extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	criteriaNumber: string
	criteriaDescription: string
	maxMark: number
	onMarkChange?: (mark: string) => void
}
