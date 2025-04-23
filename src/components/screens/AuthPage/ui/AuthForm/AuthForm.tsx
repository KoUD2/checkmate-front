'use client'

import ActiveButton from '@/components/ui/ActiveButton/ActiveButton'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChangeEvent, FC, FormEvent, useState } from 'react'
import styles from './AuthForm.module.css'

const AuthForm: FC = () => {
	const path = usePathname()
	const { login, register, loading, error } = useAuth()

	const [formData, setFormData] = useState({
		name: '',
		username: '',
		password: '',
	})
	const [formError, setFormError] = useState('')

	const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target
		setFormData(prev => ({
			...prev,
			[name]: value,
		}))
	}

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault()
		setFormError('')

		try {
			if (path === '/register') {
				if (!formData.name || !formData.username || !formData.password) {
					setFormError('Все поля обязательны для заполнения')
					return
				}
				await register(formData.name, formData.username, formData.password)
			} else {
				if (!formData.username || !formData.password) {
					setFormError('Имя пользователя и пароль обязательны')
					return
				}
				await login(formData.username, formData.password)
			}
		} catch (err) {
			const errorMessage =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message || 'Произошла ошибка'
			setFormError(errorMessage)
		}
	}

	return (
		<div className={styles['auth-form__content']}>
			<div className={styles['auth-form__form-container']}>
				<div className={styles['auth-form__header']}>
					<h1 className={styles['auth-form__title']}>
						{path === '/register' ? 'Создать аккаунт' : 'Войти'}
					</h1>
					<p className={styles['auth-form__subtitle']}>
						Начните улучшать английский уже сегодня
					</p>
				</div>
			</div>
			<div className={styles['auth-form__footer']}>
				<form className={styles['auth-form__inputs']} onSubmit={handleSubmit}>
					{path === '/register' && (
						<input
							type='text'
							name='name'
							className={styles['auth-form__input']}
							placeholder='Имя'
							autoComplete='given-name'
							value={formData.name}
							onChange={handleChange}
						/>
					)}

					<input
						type='text'
						name='username'
						className={styles['auth-form__input']}
						placeholder='Имя пользователя'
						autoComplete='username'
						value={formData.username}
						onChange={handleChange}
					/>
					<input
						type='password'
						name='password'
						className={styles['auth-form__input']}
						placeholder='Пароль'
						autoComplete={
							path === '/register' ? 'new-password' : 'current-password'
						}
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
							text={
								loading
									? 'Загрузка...'
									: path === '/register'
									? 'Создать аккаунт'
									: 'Войти'
							}
							className={styles['auth-form__register-button']}
							type='submit'
							disabled={loading}
						/>
						{path === '/register' ? (
							<p className={styles['auth-form__login-text-link']}>
								Уже есть аккаунт?{' '}
								<Link href='/login' className={styles['auth-form__login-link']}>
									Войдите
								</Link>
							</p>
						) : (
							<p className={styles['auth-form__login-text-link']}>
								Нет аккаунта?{' '}
								<Link
									href='/register'
									className={styles['auth-form__login-link']}
								>
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
