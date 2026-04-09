import Image from 'next/image'
import { FC, Suspense } from 'react'
import AuthImage from '../../../shared/images/AuthImage.svg'
import styles from './AuthPage.module.css'
import AuthForm from './ui/AuthForm/AuthForm'

const AuthPage: FC = () => {
	return (
		<div className={styles['auth-page']}>
			<div className={styles['auth-page__content-main']}>
				<Image
					src={AuthImage}
					alt='Войдите или зарегистрируйтесь'
					priority
					draggable={false}
					className={styles['auth-page__image']}
				/>
				<Suspense>
					<AuthForm />
				</Suspense>
			</div>
		</div>
	)
}

export default AuthPage
