import { JSX } from 'react'
import styles from './Criteria.module.css'
import { ICriteria } from './Criteria.props'
import MarkCriteria from './ui/MarkCriteria/MarkCriteria'
import TypeCriteria from './ui/TypeCriteria/TypeCriteria'

const Criteria = ({
	criteriaNumber,
	criteriaDescription,
	onMarkChange,
	maxMark,
	...props
}: ICriteria): JSX.Element => {
	return (
		<div className={styles['criteria']} {...props}>
			<TypeCriteria
				criteriaNumber={criteriaNumber}
				criteriaDescription={criteriaDescription}
			/>
			<MarkCriteria
				withK={true}
				maxMark={maxMark}
				onMarkChange={onMarkChange}
			/>
		</div>
	)
}

export default Criteria
