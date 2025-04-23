import { FC } from 'react'
import styles from './SecondTitle.module.css'

const SecondTitle: FC<{ text: string }> = ({ text }) => {
	return <h2 className={styles['second-title']}>{text}</h2>
}

export default SecondTitle
