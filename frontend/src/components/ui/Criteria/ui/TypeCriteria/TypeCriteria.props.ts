import { DetailedHTMLProps, HTMLAttributes } from 'react'

export interface ITypeCriteria
	extends DetailedHTMLProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> {
	criteriaNumber: string
	criteriaDescription: string
}
