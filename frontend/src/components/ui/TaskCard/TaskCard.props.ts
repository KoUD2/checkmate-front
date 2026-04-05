import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface ITaskCard
	extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	taskTitle: string
	text: string
	date: string
	status?: boolean
}
