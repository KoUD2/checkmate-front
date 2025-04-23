class TokenService {
	private _accessToken: string | null = null
	private _refreshToken: string | null = null // Добавляем refreshToken

	setAccessToken(token: string) {
		this._accessToken = token // Сохраняем accessToken локально

		// Не нужно делать запрос для установки токена
		// Этот метод должен только хранить токен для использования в запросах
		return Promise.resolve() // Возвращаем успешный Promise
	}

	// Добавляем метод для сохранения refreshToken
	setRefreshToken(token: string) {
		this._refreshToken = token
	}

	// Добавляем метод для обновления токена
	refreshAccessToken() {
		// Используем refreshToken для получения нового accessToken
		return fetch('https://checkmateai.ru/auth/refresh', {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
			// Отправляем refreshToken, а не accessToken
			body: JSON.stringify({
				refreshToken: this._refreshToken,
			}),
		})
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to refresh token')
				}
				return response.json()
			})
			.then(data => {
				if (data.accessToken) {
					this._accessToken = data.accessToken
				}
				return data
			})
	}

	getAccessToken(): string | null {
		return this._accessToken
	}

	getRefreshToken(): string | null {
		return this._refreshToken
	}

	clearTokens() {
		this._accessToken = null
		this._refreshToken = null
	}
}

const tokenService = new TokenService()
export default tokenService
