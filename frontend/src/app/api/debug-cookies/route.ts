import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
	return NextResponse.json({
		cookies: Object.fromEntries(
			request.cookies.getAll().map(c => [c.name, c.value])
		),
		cookieHeader: request.headers.get('cookie'),
		headers: Object.fromEntries(request.headers.entries()),
	})
}
