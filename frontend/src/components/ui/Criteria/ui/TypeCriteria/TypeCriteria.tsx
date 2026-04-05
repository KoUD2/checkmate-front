import { JSX } from 'react'
import styles from './TypeCriteria.module.css'
import { ITypeCriteria } from './TypeCriteria.props'

const TypeCriteria = ({
	criteriaNumber,
	criteriaDescription,
	...props
}: ITypeCriteria): JSX.Element => {
	return (
		<div className={styles['type-criteria']} {...props}>
			<h3 className={styles['type-criteria__number']}>{criteriaNumber}</h3>
			<h3 className={styles['type-criteria__description']}>
				{criteriaDescription}
			</h3>
		</div>
	)
}

export default TypeCriteria
