import { jwtVerify } from 'jose'

export async function verifyJWT(token: string): Promise<boolean> {
	try {
		const secret = new TextEncoder().encode(process.env.JWT_ACCESS_SECRET)
		await jwtVerify(token, secret)
		return true
	} catch (error) {
		console.error('JWT verification error:', error)
		return false
	}
}
