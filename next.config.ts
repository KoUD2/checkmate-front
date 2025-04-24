// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: 'https://checkmateai.ru/:path*',
			},
		]
	},
}

export default nextConfig
