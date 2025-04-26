// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'

// 1. Добавляем публичные страницы и API пути
const PUBLIC_PAGES = new Set(['/login', '/register'])

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Публичные пути - пропускаем
	if (PUBLIC_PAGES.has(pathname)) {
		return NextResponse.next()
	}

	// Проверяем ТОЛЬКО наличие куки, БЕЗ проверки подписи
	const accessToken = request.cookies.get('accessToken')?.value

	if (!accessToken) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	// Если на странице логина и есть токен - редирект на главную
	if (pathname === '/login' && accessToken) {
		return NextResponse.redirect(new URL('/', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
}
