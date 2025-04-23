import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = new Set(['/login', '/register', '/_next', '/favicon.ico'])

export async function middleware(request: NextRequest) {
	if (process.env.NODE_ENV === 'development') {
		// В dev-режиме пропускаем все проверки и редиректы
		return NextResponse.next()
	}

	const { pathname } = request.nextUrl

	// Пропускаем статические файлы и публичные пути
	if (PUBLIC_PATHS.has(pathname) || pathname.startsWith('/_next')) {
		return NextResponse.next()
	}

	// Проверка cookies через заголовки и объект cookies
	const accessToken = request.cookies.get('accessToken')?.value
	const cookieHeader = request.headers.get('cookie') || ''

	console.log('Middleware check for:', pathname)
	console.log('AccessToken in cookies:', accessToken)
	console.log('Cookies in header:', cookieHeader.includes('accessToken'))

	if (!accessToken && !cookieHeader.includes('accessToken')) {
		const response = NextResponse.redirect(new URL('/login', request.url))
		response.headers.set('x-middleware-cache', 'no-cache')
		return response
	}

	const response = NextResponse.next()
	response.headers.set('x-middleware-cache', 'no-cache')
	return response
}

export const config = {
	matcher: [
		'/((?!api|_next/static|_next/image|favicon.ico|login|register|_next).*)',
	],
}
