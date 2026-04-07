'use client'

import { createContext, useContext, useState, ReactNode, FC } from 'react'

export type TaskType = '37' | '38.1' | '38.2'

export interface Task37Result {
	kind: 'task37'
	k1: number
	k2: number
	k3: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string }
}

export interface Task38Result {
	kind: 'task38'
	k1: number
	k2: number
	k3: number
	k4: number
	k5: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string; k4: string; k5: string }
}

export type TaskResult = Task37Result | Task38Result

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

export type TaskFormData = Task37FormData | Task38FormData

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
	}

	const completeCheck = (result: TaskResult) => {
		setState(prev => ({ ...prev, isChecking: false, isChecked: true, result }))
	}

	const failCheck = (error: string) => {
		setState(prev => ({ ...prev, isChecking: false, error }))
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
