/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	async rewrites() {
		return [
			{
				source: '/api/proxy/:path*',
				destination: `${process.env.BACKEND_URL || 'http://localhost:3001'}/:path*`,
			},
		]
	},
}

export default nextConfig
