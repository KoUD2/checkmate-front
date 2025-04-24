import axios from 'axios'
import { getCookie } from 'cookies-next'

// Always use the relative path to route through Next.js API routes
const baseURL = '/api'

const api = axios.create({
	baseURL,
	withCredentials: true,
	headers: {
		'Content-Type': 'application/json',
	},
})

api.interceptors.request.use(config => {
	const accessToken = getCookie('accessToken')
	if (accessToken) {
		config.headers.Authorization = `Bearer ${accessToken}`
	}
	return config
})

export default api
