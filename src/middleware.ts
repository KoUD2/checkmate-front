// middleware.ts
import { NextResponse, type NextRequest } from 'next/server'
import { verifyJWT } from './lib/auth'

// 1. Добавляем публичные страницы и API пути
const PUBLIC_PAGES = new Set(['/login', '/register'])
const PUBLIC_API_PATHS = new Set([
	'/api/auth/login',
	'/api/auth/register',
	'/api/auth/refresh',
])

// 2. Функция обработки CORS
function handleCORS(
	requestOrResponse: NextRequest | NextResponse,
	request?: NextRequest
): NextResponse {
	const response =
		requestOrResponse instanceof NextResponse
			? requestOrResponse
			: new NextResponse(null, { status: 200 })

	const origin = request ? request.headers.get('origin') || '' : '*'

	response.headers.set('Access-Control-Allow-Origin', origin)
	response.headers.set('Access-Control-Allow-Credentials', 'true')
	response.headers.set(
		'Access-Control-Allow-Methods',
		'GET, POST, PUT, DELETE, OPTIONS'
	)
	response.headers.set(
		'Access-Control-Allow-Headers',
		'Content-Type, Authorization, X-Requested-With'
	)

	return response
}

// 3. Функция обработки неавторизованных запросов
function unauthorizedResponse(request: NextRequest): NextResponse {
	const isApiRequest = request.nextUrl.pathname.startsWith('/api/')

	if (isApiRequest) {
		const response = NextResponse.json(
			{ message: 'Unauthorized' },
			{ status: 401 }
		)
		return handleCORS(response, request)
	}

	const loginUrl = new URL('/login', request.url)
	return NextResponse.redirect(loginUrl)
}

// middleware.ts
export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const isPublicPage = PUBLIC_PAGES.has(pathname)

	// Пропускаем CORS для OPTIONS
	if (request.method === 'OPTIONS') {
		return handleCORS(request)
	}

	// Для публичных страниц просто пропускаем
	if (isPublicPage || PUBLIC_API_PATHS.has(pathname)) {
		return handleCORS(NextResponse.next(), request)
	}

	// Проверка авторизации
	const accessToken = request.cookies.get('accessToken')?.value
	let isAuthenticated = false

	if (accessToken) {
		try {
			isAuthenticated = await verifyJWT(accessToken)
		} catch (error) {
			console.error('Auth check failed:', error)
		}
	}

	// Редирект для неавторизованных
	if (!isAuthenticated) {
		// Дополнительная проверка для страницы логина
		if (pathname === '/login') {
			return NextResponse.next()
		}
		return unauthorizedResponse(request)
	}

	// Для авторизованных пользователей на странице логина - редирект
	if (isAuthenticated && pathname === '/login') {
		return NextResponse.redirect(new URL('/', request.url))
	}

	return handleCORS(NextResponse.next(), request)
}

export const config = {
	matcher: ['/((?!api/|_next/static|_next/image|favicon.ico).*)'],
}
