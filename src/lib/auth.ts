// lib/auth.ts
import { jwtVerify } from 'jose'

export async function verifyJWT(token: string): Promise<boolean> {
	try {
		// Секрет должен быть в том же формате, как на сервере
		// Вариант 1: текстовый ключ (обычная строка)
		const secretText = process.env.JWT_ACCESS_SECRET!
		const secretKey = new TextEncoder().encode(secretText)

		// Вариант 2: если секрет на сервере в base64
		// const secretBase64 = process.env.JWT_ACCESS_SECRET!;
		// const secretKey = Buffer.from(secretBase64, 'base64');

		// Расширенная проверка с логированием
		console.log('Trying to verify token with alg: HS256')

		const result = await jwtVerify(token, secretKey, {
			algorithms: ['HS256'], // Явно указываем алгоритм
		})

		console.log('JWT verification successful, payload:', result.payload)
		return true
	} catch (error: unknown) {
		// Детальное логирование ошибки
		console.error('JWT verification failed:', error)

		// Проверка типа перед доступом к свойствам
		if (error instanceof Error) {
			if ('code' in error) {
				// Теперь TypeScript знает, что объект error имеет свойство code
				const errorWithCode = error as { code: string }

				if (errorWithCode.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
					console.error('Причина: неправильный секрет или алгоритм подписи')
				} else if (errorWithCode.code === 'ERR_JWT_EXPIRED') {
					console.error('Причина: токен истек')
				}
			}
		}

		return false
	}
}
