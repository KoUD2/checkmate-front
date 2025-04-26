class TokenService {
	private _accessToken: string | null = null
	private _refreshToken: string | null = null

	setAccessToken(token: string) {
		this._accessToken = token

		// В Next.js 15 рекомендуется использовать js-cookie или эквивалент
		try {
			const cookieOptions = 'path=/; max-age=900; samesite=lax'
			document.cookie = `accessToken=${token}; ${cookieOptions}`
		} catch (error) {
			console.error('Error setting access token cookie:', error)
		}

		return Promise.resolve()
	}

	setRefreshToken(token: string) {
		this._refreshToken = token

		try {
			const cookieOptions = 'path=/; max-age=604800; samesite=lax'
			document.cookie = `refreshToken=${token}; ${cookieOptions}`
		} catch (error) {
			console.error('Error setting refresh token cookie:', error)
		}
	}

	refreshAccessToken() {
		// Используем https URL
		const apiBaseUrl =
			process.env.NEXT_PUBLIC_API_URL || 'https://checkmateai.ru'
		return fetch(`${apiBaseUrl}/auth/refresh`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				refresh_token: this.getRefreshToken(),
			}),
		})
			.then(response => {
				if (!response.ok) {
					throw new Error('Failed to refresh token')
				}
				return response.json()
			})
			.then(data => {
				const newAccessToken = data.accessToken || data.access_token
				if (newAccessToken) {
					this.setAccessToken(newAccessToken)
				}
				return data
			})
	}

	getAccessToken(): string | null {
		if (!this._accessToken) {
			// Try to get from cookie if not in memory
			try {
				const cookies = document.cookie.split(';')
				for (const cookie of cookies) {
					const [name, value] = cookie.trim().split('=')
					if (name === 'accessToken' && value) {
						this._accessToken = value
						break
					}
				}
			} catch {
				// Ignore errors in SSR mode
			}
		}
		return this._accessToken
	}

	getRefreshToken(): string | null {
		if (!this._refreshToken) {
			// Try to get from cookie if not in memory
			try {
				const cookies = document.cookie.split(';')
				for (const cookie of cookies) {
					const [name, value] = cookie.trim().split('=')
					if (name === 'refreshToken' && value) {
						this._refreshToken = value
						break
					}
				}
			} catch {
				// Ignore errors in SSR mode
			}
		}
		return this._refreshToken
	}

	clearTokens() {
		this._accessToken = null
		this._refreshToken = null

		// Очищаем куки при выходе
		try {
			document.cookie =
				'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict'
			document.cookie =
				'refreshToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; secure; samesite=strict'
		} catch {
			// Игнорируем ошибки в SSR режиме
		}
	}
}

const tokenService = new TokenService()
export default tokenService
