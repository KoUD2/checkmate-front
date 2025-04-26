import { jwtVerify } from 'jose'

export async function verifyJWT(token: string): Promise<boolean> {
	try {
		// 1. Используем правильную переменную окружения
		const secret = new TextEncoder().encode(process.env.JWT_SECRET)
		const result = await jwtVerify(token, secret)

		// 2. Добавляем проверку срока действия токена
		if (Date.now() >= (result.payload.exp || 0) * 1000) {
			throw new Error('Token expired')
		}

		return true
	} catch (error) {
		console.error('JWT Verification Error:', error)
		return false
	}
}
