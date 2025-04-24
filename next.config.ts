/** @type {import('next').NextConfig} */
const nextConfig = {
	// Remove the rewrites for the auth endpoints
	async rewrites() {
		return [
			// Keep other rewrites if needed, but remove those that conflict with your API routes
		]
	},
}

export default nextConfig
