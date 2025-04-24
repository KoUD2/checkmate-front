// middleware.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
	// Skip middleware processing for non-API routes
	if (!request.nextUrl.pathname.startsWith('/api/')) {
		return NextResponse.next()
	}

	// Handle preflight requests
	if (request.method === 'OPTIONS') {
		const response = new NextResponse(null, { status: 200 })
		applyHeaders(response, request)
		return response
	}

	// For other requests, just apply the headers
	const response = NextResponse.next()
	applyHeaders(response, request)
	return response
}

function applyHeaders(response: NextResponse, request: NextRequest) {
	const origin = request.headers.get('origin') || ''

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
}

export const config = {
	matcher: '/api/:path*',
}
