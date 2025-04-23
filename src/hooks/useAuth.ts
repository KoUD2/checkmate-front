'use client'

import { AuthContext } from '@/config/context/AuthContext'
import { useContext } from 'react'

export function useAuth() {
	const context = useContext(AuthContext)

	if (context === null) {
		throw new Error('useAuth должен использоваться внутри AuthProvider')
	}

	return context
}
