'use client'

import { createContext, useContext, useState, ReactNode, FC } from 'react'

export type TaskType = '37' | '38.1' | '38.2' | '39' | '40' | '41'

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

export interface Task39Result {
	kind: 'task39'
	k1: number
	totalScore: number
	feedback: { k1: string }
	transcription: string
}

export interface Task40Result {
	kind: 'task40'
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
	k1: number
	k2: number
	k3: number
	k4: number
	k5: number
	totalScore: number
	feedback: { k1: string; k2: string; k3: string; k4: string; k5: string }
	transcription: string
}

export type TaskResult = Task37Result | Task38Result | Task39Result | Task40Result | Task41Result

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

export type TaskFormData = Task37FormData | Task38FormData | Task39FormData | Task40FormData | Task41FormData

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
