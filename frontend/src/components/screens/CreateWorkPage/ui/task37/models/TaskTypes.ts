export interface Comment {
	criterion: string
	end_pos: number
	start_pos: number
	text: string
}

export interface TaskFormData {
	comments: Comment[]
	email: string
	essay: string
	k1: number
	k2: number
	k3: number
	questions_theme: string
	subject: string
}
