import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface IMarkCriteria
	extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	withK?: boolean
	maxMark: number
	onMarkChange?: (mark: string) => void
}
