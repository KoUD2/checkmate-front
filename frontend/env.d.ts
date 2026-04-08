declare namespace NodeJS {
	interface ProcessEnv {
		JWT_ACCESS_SECRET: string
		JWT_REFRESH_SECRET: string
		NODE_ENV: 'development' | 'production'
		NEXT_PUBLIC_TELEGRAM_BOT_NAME: string
	}
}
