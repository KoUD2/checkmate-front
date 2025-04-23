import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { name, username, password } = await request.json()

		if (!name || !username || !password) {
			return NextResponse.json(
				{ message: 'Все поля обязательны для заполнения' },
				{ status: 400 }
			)
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const _hashedPassword = await bcrypt.hash(password, 10)

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
				user: { id: /* user.id */ 1, name, username },
				accessToken,
			},
			{ status: 201 }
		)

		response.cookies.set({
			name: 'refreshToken',
			value: refreshToken,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'strict',
			maxAge: 7 * 24 * 60 * 60, // 7 дней
			path: '/',
		})

		return response
	} catch (error) {
		console.error('Registration error:', error)
		return NextResponse.json(
			{ message: 'Произошла ошибка при регистрации' },
			{ status: 500 }
		)
	}
}
