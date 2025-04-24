import axios from 'axios'
import { getCookie } from 'cookies-next'

// Для локальной разработки и билда используем относительные пути к API-маршрутам
const isServerSide = typeof window === 'undefined'
const baseURL = isServerSide
	? process.env.NEXT_PUBLIC_API_URL || 'https://checkmateai.ru'
	: '/api'

const apiClient = axios.create({
	baseURL,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
})

apiClient.interceptors.request.use(config => {
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

		if (error.response?.status === 401 && !originalRequest._retry) {
			originalRequest._retry = true

			try {
				// Перенаправляем на страницу логина при проблемах с авторизацией
				window.location.href = '/login'
				return Promise.reject(error)
			} catch (refreshError) {
				return Promise.reject(refreshError)
			}
		}

		return Promise.reject(error)
	}
)

export default apiClient
