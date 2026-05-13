'use client'

import posthog from 'posthog-js'
import { createContext, useContext, useState, ReactNode, FC } from 'react'

export type TaskType = '37' | '38.1' | '38.2' | '39' | '40' | '41' | '42'

export interface Task37Result {
	kind: 'task37'
	taskId: string
	k1: number
	k2: number
	k3: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string }
}

export interface Task38Result {
	kind: 'task38'
	taskId: string
	k1: number
	k2: number
	k3: number
	k4: number
	k5: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string; k4: string; k5: string }
}

export interface Task39Result {
	kind: 'task39'
	taskId: string
	k1: number
	totalScore: number
	feedback: { k1: string }
	transcription: string
}

export interface Task40Result {
	kind: 'task40'
	taskId: string
	k1: number
	k2: number
	k3: number
	k4: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string; k4: string }
	transcription: string
}

export interface Task41Result {
	kind: 'task41'
	taskId: string
	k1: number
	k2: number
	k3: number
	k4: number
	k5: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string; k4: string; k5: string }
	transcription: string
}

export interface Task42Result {
	kind: 'task42'
	taskId: string
	k1: number
	k2: number
	k3: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string }
	transcription: string
}

export type TaskResult = Task37Result | Task38Result | Task39Result | Task40Result | Task41Result | Task42Result

export interface Task37FormData {
	kind: 'task37'
	subject: string
	emailText: string
	inlineInput: string
	studentWork: string
	solutionImageBase64?: string
	solutionImageFileName?: string
}

export interface Task38FormData {
	kind: 'task38'
	topic: string
	problemFill: string
	opinionFill: string
	studentWork: string
	imageBase64?: string
	imageFileName?: string
	solutionImageBase64?: string
	solutionImageFileName?: string
}

export interface Task39FormData {
	kind: 'task39'
	taskText: string
}

export interface Task40FormData {
	kind: 'task40'
	imageBase64?: string
}

export interface Task41FormData {
	kind: 'task41'
}

export interface Task42FormData {
	kind: 'task42'
}

export type TaskFormData = Task37FormData | Task38FormData | Task39FormData | Task40FormData | Task41FormData | Task42FormData

interface TaskCheckState {
	isChecking: boolean
	isChecked: boolean
	taskType: TaskType | null
	formData: TaskFormData | null
	result: TaskResult | null
	error: string
}

interface TaskCheckContextType extends TaskCheckState {
	startCheck: (taskType: TaskType, formData: TaskFormData) => void
	completeCheck: (result: TaskResult) => void
	failCheck: (error: string) => void
	resetCheck: () => void
}

const initialState: TaskCheckState = {
	isChecking: false,
	isChecked: false,
	taskType: null,
	formData: null,
	result: null,
	error: '',
}

export const TaskCheckContext = createContext<TaskCheckContextType | null>(null)

export const TaskCheckProvider: FC<{ children: ReactNode }> = ({ children }) => {
	const [state, setState] = useState<TaskCheckState>(initialState)

	const startCheck = (taskType: TaskType, formData: TaskFormData) => {
		setState({ ...initialState, isChecking: true, taskType, formData })
		posthog.capture('check_started', { taskType })
	}

	const completeCheck = (result: TaskResult) => {
		setState(prev => ({ ...prev, isChecking: false, isChecked: true, result }))
		posthog.capture('check_completed', { taskType: result.kind, totalScore: result.totalScore })
		if (!localStorage.getItem('activated')) {
			posthog.capture('user_activated')
			localStorage.setItem('activated', '1')
		}
	}

	const failCheck = (error: string) => {
		setState(prev => ({ ...prev, isChecking: false, error }))
		posthog.capture('check_failed', { taskType: state.taskType, error })
	}

	const resetCheck = () => {
		setState(initialState)
	}

	return (
		<TaskCheckContext.Provider value={{ ...state, startCheck, completeCheck, failCheck, resetCheck }}>
			{children}
		</TaskCheckContext.Provider>
	)
}

export function useTaskCheck() {
	const ctx = useContext(TaskCheckContext)
	if (!ctx) throw new Error('useTaskCheck must be used inside TaskCheckProvider')
	return ctx
}
