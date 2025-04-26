// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifyJWT } from './lib/auth'

// Публичные страницы (не требуют авторизации)
const PUBLIC_PAGES = new Set(['/login', '/register'])

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Публичные страницы пропускаем
	if (PUBLIC_PAGES.has(pathname)) {
		return NextResponse.next()
	}

	// Получаем токен из куки
	const accessToken = request.cookies.get('accessToken')?.value

	// Если токена нет - редирект на логин
	if (!accessToken) {
		console.log('No access token found, redirecting to login')
		return NextResponse.redirect(new URL('/login', request.url))
	}

	// Проверяем подпись токена
	try {
		const isValid = await verifyJWT(accessToken)

		if (!isValid) {
			console.log('Token signature invalid, redirecting to login')
			return NextResponse.redirect(new URL('/login', request.url))
		}

		// Для авторизованных на странице логина - редирект на главную
		if (pathname === '/login') {
			return NextResponse.redirect(new URL('/', request.url))
		}

		// Токен валидный - пропускаем запрос
		return NextResponse.next()
	} catch (error) {
		console.error('Token verification error:', error)
		return NextResponse.redirect(new URL('/login', request.url))
	}
}

export const config = {
	matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
