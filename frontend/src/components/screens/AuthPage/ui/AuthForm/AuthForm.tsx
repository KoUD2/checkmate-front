'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChangeEvent, FC, FormEvent, useState } from 'react'
import styles from './AuthForm.module.css'

const AuthForm: FC = () => {
	const path = usePathname()
	const { login, signup, loading, error } = useAuth()
	const isRegister = path === '/register'

	const [formData, setFormData] = useState({
		email: '',
		firstName: '',
		lastName: '',
		password: '',
	})
	const [formError, setFormError] = useState('')

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setFormError('')

		try {
			if (isRegister) {
				if (!formData.email || !formData.firstName || !formData.lastName || !formData.password) {
					setFormError('Все поля обязательны для заполнения')
					return
				}
				await signup(formData.email, formData.firstName, formData.lastName, formData.password)
			} else {
				if (!formData.email || !formData.password) {
					setFormError('Email и пароль обязательны')
					return
				}
				await login(formData.email, formData.password)
			}
		} catch (err) {
			const errorMessage =
				(err as { message?: string })?.message || 'Произошла ошибка'
			setFormError(errorMessage)
		}
	}

	return (
		<div className={styles['auth-form__content']}>
			<div className={styles['auth-form__form-container']}>
				<div className={styles['auth-form__header']}>
					<h1 className={styles['auth-form__title']}>
						{isRegister ? 'Создать аккаунт' : 'Войти'}
					</h1>
					<p className={styles['auth-form__subtitle']}>
						Начните улучшать английский уже сегодня
					</p>
				</div>
			</div>
			<div className={styles['auth-form__footer']}>
				<form className={styles['auth-form__inputs']} onSubmit={handleSubmit}>
					{isRegister && (
						<>
							<input
								type='text'
								name='firstName'
								className={styles['auth-form__input']}
								placeholder='Имя'
								autoComplete='given-name'
								value={formData.firstName}
								onChange={handleChange}
							/>
							<input
								type='text'
								name='lastName'
								className={styles['auth-form__input']}
								placeholder='Фамилия'
								autoComplete='family-name'
								value={formData.lastName}
								onChange={handleChange}
							/>
						</>
					)}

					<input
						type='email'
						name='email'
						className={styles['auth-form__input']}
						placeholder='Email'
						autoComplete='email'
						value={formData.email}
						onChange={handleChange}
					/>
					<input
						type='password'
						name='password'
						className={styles['auth-form__input']}
						placeholder='Пароль'
						autoComplete={isRegister ? 'new-password' : 'current-password'}
						value={formData.password}
						onChange={handleChange}
					/>

					{(formError || error) && (
						<div className={styles['auth-form__error']}>
							{formError || error}
						</div>
					)}

					<div className={styles['auth-form__buttons']}>
						<ActiveButton
							text={loading ? 'Загрузка...' : isRegister ? 'Создать аккаунт' : 'Войти'}
							className={styles['auth-form__register-button']}
							type='submit'
							disabled={loading}
						/>
						{isRegister ? (
							<p className={styles['auth-form__login-text-link']}>
								Уже есть аккаунт?{' '}
								<Link href='/login' className={styles['auth-form__login-link']}>
									Войдите
								</Link>
							</p>
						) : (
							<p className={styles['auth-form__login-text-link']}>
								Нет аккаунта?{' '}
								<Link href='/register' className={styles['auth-form__login-link']}>
									Зарегистрируйтесь
								</Link>
							</p>
						)}
					</div>
				</form>
			</div>
		</div>
	)
}

export default AuthForm
