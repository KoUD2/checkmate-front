import jwt from 'jsonwebtoken'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		// Получаем refreshToken из тела запроса
		const body = await request.json()
		const { refreshToken } = body

		// Проверяем наличие токена
		if (!refreshToken) {
			return NextResponse.json(
				{ message: 'Refresh токен отсутствует' },
				{ status: 400 }
			)
		}

		try {
			// Верифицируем refreshToken
			const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!)

			if (typeof payload === 'string' || !payload.id) {
				throw new Error('Invalid token payload')
			}

			// Создаем новый accessToken
			const accessToken = jwt.sign(
				{ id: payload.id, username: payload.username || 'username' },
				process.env.JWT_ACCESS_SECRET!,
				{ expiresIn: '15m' }
			)

			// Создаем новый refreshToken (optional)
			const newRefreshToken = jwt.sign(
				{ id: payload.id },
				process.env.JWT_REFRESH_SECRET!,
				{ expiresIn: '7d' }
			)

			// Настраиваем ответ
			const response = NextResponse.json(
				{ accessToken, refreshToken: newRefreshToken },
				{ status: 200 }
			)

			// Устанавливаем CORS заголовки
			const origin = request.headers.get('origin') || 'http://localhost:3000'
			response.headers.set('Access-Control-Allow-Origin', origin)
			response.headers.set('Access-Control-Allow-Credentials', 'true')
			response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
			response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

			return response
		} catch (error) {
			console.error('Invalid refresh token:', error)
			return NextResponse.json(
				{ message: 'Недействительный refresh токен' },
				{ status: 401 }
			)
		}
	} catch (error) {
		console.error('Refresh token error:', error)
		return NextResponse.json(
			{ message: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
