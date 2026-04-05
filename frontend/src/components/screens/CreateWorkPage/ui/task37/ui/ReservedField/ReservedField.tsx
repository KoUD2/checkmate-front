import { JSX } from 'react'
import styles from './ReservedField.module.css'
import { IReservedField } from './ReservedField.props'

const ReservedField = ({ text, ...props }: IReservedField): JSX.Element => {
	return (
		<div className={styles['reserved-field']} {...props}>
			<p className={styles['reserved-field__text']}>{text}</p>
		</div>
	)
}

export default ReservedField
