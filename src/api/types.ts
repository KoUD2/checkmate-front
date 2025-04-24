export interface Comment {
	criterion: string
	end_pos: number
	start_pos: number
	text: string
}

export interface EssayFormData {
	comments: Comment[]
	email: string
	essay: string
	k1: number
	k2: number
	k3: number
	questions_theme: string
	subject: string
}

export interface Marks {
	К1: string
	К2: string
	К3: string
}
