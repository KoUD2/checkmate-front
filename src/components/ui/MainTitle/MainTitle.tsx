import { FC } from 'react'
import styles from './MainTitle.module.css'

const MainTitle: FC<{ text: string }> = ({ text }) => {
	return <h1 className={styles['main-title']}>{text}</h1>
}

export default MainTitle
