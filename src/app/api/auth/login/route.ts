import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { username, password } = await request.json()

		if (!username || !password) {
			return NextResponse.json(
				{ message: 'Имя пользователя и пароль обязательны' },
				{ status: 400 }
			)
		}

		// const user = await prisma.user.findUnique({ where: { username } });
		// if (!user || !(await bcrypt.compare(password, user.password))) {
		//   return NextResponse.json(
		//     { message: 'Неверные учетные данные' },
		//     { status: 401 }
		//   );
		// }

		const accessToken = jwt.sign(
			{ id: 1, username },
			process.env.JWT_ACCESS_SECRET!,
			{ expiresIn: '15m' }
		)

		const refreshToken = jwt.sign({ id: 1 }, process.env.JWT_REFRESH_SECRET!, {
			expiresIn: '7d',
		})

		const response = NextResponse.json(
			{
				user: { id: 1, name: 'Test', username },
				accessToken,
			},
			{ status: 200 }
		)

		// Настройка CORS заголовков
		const origin = request.headers.get('origin') || 'http://localhost:3000'
		response.headers.set('Access-Control-Allow-Origin', origin)
		response.headers.set('Access-Control-Allow-Credentials', 'true')
		response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
		response.headers.set('Access-Control-Allow-Headers', 'Content-Type')

		// Отключение кэширования
		response.headers.set('x-middleware-cache', 'no-cache')

		// Убедитесь, что домен куки соответствует вашему приложению
		const domain =
			process.env.NODE_ENV === 'production' ? 'checkmateai.ru' : undefined

		// В API роуте /auth/login
		response.cookies.set({
			name: 'accessToken',
			value: accessToken,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			path: '/',
			maxAge: 15 * 60,
			domain:
				process.env.NODE_ENV === 'production' ? 'checkmateai.ru' : undefined,
		})

		response.cookies.set({
			name: 'refreshToken',
			value: refreshToken,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 604800,
			path: '/',
			domain: domain,
		})

		return response
	} catch (error) {
		console.error('Ошибка входа:', error)
		return NextResponse.json(
			{ message: 'Внутренняя ошибка сервера' },
			{ status: 500 }
		)
	}
}
