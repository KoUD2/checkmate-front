'use client'

import {
	default as authService,
	default as AuthService,
} from '@/services/auth.service'
import {
	default as tokenService,
	default as TokenService,
} from '@/services/token.service'
import { createContext, ReactNode, useEffect, useState } from 'react'

interface AuthResponse {
	accessToken: string
	user: User
}

interface User {
	id: number
	name: string
	username: string
}

interface AuthContextType {
	user: User | null
	loading: boolean
	error: string | null
	register: (name: string, username: string, password: string) => Promise<void>
	login: (username: string, password: string) => Promise<void>
	isAuthenticated: boolean
}

export const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
	children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<User | null>(null)
	const [loading, setLoading] = useState<boolean>(true)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		const checkAuth = async () => {
			try {
				setLoading(false)
			} catch {
				setLoading(false)
			}
		}
		checkAuth()
	}, [])

	const register = async (
		name: string,
		username: string,
		password: string
	): Promise<void> => {
		try {
			setLoading(true)
			setError(null)

			const response = (await AuthService.register(
				name,
				username,
				password
			)) as AuthResponse
			TokenService.setAccessToken(response.accessToken)
			setUser(response.user)

			setLoading(false)
			window.location.href = '/'
		} catch (err: unknown) {
			const errorMessage =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message || 'Произошла ошибка при регистрации'
			setError(errorMessage)
			setLoading(false)
			throw err
		}
	}

	const login = async (username: string, password: string): Promise<void> => {
		try {
			setLoading(true)
			setError(null)

			const response = await authService.login(username, password)
			const { accessToken, refreshToken } = response

			// Сохраняем токены в сервисе
			tokenService.setAccessToken(accessToken)
			tokenService.setRefreshToken(refreshToken)
			setUser(response.user)

			setLoading(false)
			window.location.href = '/'
		} catch (err: unknown) {
			const errorMessage =
				(err as { response?: { data?: { message?: string } } })?.response?.data
					?.message || 'Неверное имя пользователя или пароль'
			setError(errorMessage)
			setLoading(false)
			throw err
		}
	}

	// const logout = async (): Promise<void> => {
	// 	try {
	// 		await AuthService.logout()
	// 		TokenService.clearAccessToken()
	// 		setUser(null)
	// 		router.push('/login')
	// 	} catch (err) {
	// 		console.error('Logout error:', err)
	// 	}
	// }

	const value: AuthContextType = {
		user,
		loading,
		error,
		register,
		login,
		isAuthenticated: !!user,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
