import api from '@/shared/utils/api'
import tokenService from './token.service'

class AuthService {
	async register(name: string, username: string, password: string) {
		try {
			const response = await api.post('/auth/register', {
				name,
				username,
				password,
			})
			return response.data
		} catch (error) {
			throw error
		}
	}

	private tokenService: typeof tokenService

	constructor() {
		// 3. Инициализируем service в конструкторе
		this.tokenService = tokenService
	}

	async login(username: string, password: string) {
		try {
			const response = await api.post('/auth/login', {
				username,
				password,
			})

			const { access_token, refresh_token } = response.data
			if (!access_token) throw new Error('No access token received')

			// Установка куки с флагом secure
			tokenService.setAccessToken(access_token)
			if (refresh_token) tokenService.setRefreshToken(refresh_token)

			// Принудительный редирект с обновлением страницы
			if (typeof window !== 'undefined') {
				window.location.href = '/'
				window.location.reload() // Добавляем принудительное обновление
			}

			return response.data
		} catch (error) {
			console.error('Login error:', error)
			throw error
		}
	}

	async refreshToken() {
		try {
			const response = await api.post('/auth/refresh', {
				refreshToken: localStorage.getItem('refreshToken') || '',
			})

			return response.data
		} catch (error) {
			throw error
		}
	}

	async logout() {
		try {
			await api.post('/auth/logout')
		} catch (error) {
			throw error
		}
	}
}

const authService = new AuthService()
export default authService
