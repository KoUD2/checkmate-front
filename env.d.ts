declare namespace NodeJS {
	interface ProcessEnv {
		JWT_ACCESS_SECRET: string
		JWT_REFRESH_SECRET: string
		NODE_ENV: 'development' | 'production'
	}
}
