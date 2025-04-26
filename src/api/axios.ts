import axios from 'axios'
import { getCookie } from 'cookies-next' // Рекомендуется для Next.js 15

const baseURL = '/api'

const apiClient = axios.create({
	baseURL,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
})

apiClient.interceptors.request.use(config => {
	// Получение токена из куки
	const accessToken = getCookie('accessToken')

	if (accessToken) {
		config.headers.Authorization = `Bearer ${accessToken}`
	}
	return config
})

apiClient.interceptors.response.use(
	response => response,
	async error => {
		const originalRequest = error.config

		// Обработка 401 ошибки (Unauthorized)
		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true

			try {
				// Получение refresh токена
				const refreshToken = getCookie('refreshToken')

				if (refreshToken) {
					// Попытка обновить токен
					const { data } = await axios.post('/api/auth/refresh', {
						refresh_token: refreshToken,
					})

					// Установка нового токена
					if (data.access_token || data.accessToken) {
						const newToken = data.access_token || data.accessToken

						// Сохранение нового токена в куки
						document.cookie = `accessToken=${newToken}; path=/; max-age=900; samesite=lax`

						// Установка нового токена в заголовок
						originalRequest.headers.Authorization = `Bearer ${newToken}`

						// Повторение оригинального запроса с новым токеном
						return axios(originalRequest)
					}
				}

				// Если не удалось обновить токен - перенаправление на страницу входа
				if (typeof window !== 'undefined') {
					window.location.href = '/login'
				}
			} catch (refreshError) {
				console.error('Ошибка обновления токена:', refreshError)

				// При ошибке обновления - перенаправление на страницу входа
				if (typeof window !== 'undefined') {
					window.location.href = '/login'
				}

				return Promise.reject(refreshError)
			}
		}

		return Promise.reject(error)
	}
)

export default apiClient
