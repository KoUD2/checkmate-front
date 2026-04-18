// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

const PUBLIC_PAGES = new Set(['/login', '/register'])
const PUBLIC_PREFIXES = ['/resources']

export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl

	const hasToken =
		!!request.cookies.get('accessToken')?.value ||
		!!request.cookies.get('refreshToken')?.value

	// Если на странице логина/регистрации и есть токен — на главную
	if (PUBLIC_PAGES.has(pathname) && hasToken) {
		return NextResponse.redirect(new URL('/', request.url))
	}

	// Если на защищённой странице без токена — на логин
	const isPublicPrefix = PUBLIC_PREFIXES.some(p => pathname.startsWith(p))
	if (!PUBLIC_PAGES.has(pathname) && !isPublicPrefix && !hasToken) {
		return NextResponse.redirect(new URL('/login', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: [
		'/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api-auth/|api/).*)',
	],
}
