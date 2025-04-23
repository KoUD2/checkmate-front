import { Comment, TaskFormData } from '../models/TaskTypes'

export const formatTaskData = (
	subject: string,
	emailText: string,
	inlineInput: string,
	studentWork: string,
	marks: { [key: string]: string }
): TaskFormData => {
	const comments: Comment[] = [
		{
			criterion: 'string',
			end_pos: 0,
			start_pos: 0,
			text: 'string',
		},
	]

	return {
		comments,
		email: emailText,
		essay: studentWork,
		k1: Number(marks['К1']),
		k2: Number(marks['К2']),
		k3: Number(marks['К3']),
		questions_theme: inlineInput,
		subject,
	}
}

export const submitTaskData = async (data: TaskFormData): Promise<void> => {
	try {
		const response = await fetch('essays', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})

		if (!response.ok) {
			throw new Error('Failed to submit data')
		}

		console.log('Data submitted successfully')
	} catch (error) {
		console.error('Error submitting data:', error)
		throw error
	}
}
