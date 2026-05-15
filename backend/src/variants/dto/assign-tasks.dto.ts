import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsUUID } from 'class-validator'

export class AssignTasksDto {
	@ApiProperty({ type: [String] })
	@IsArray()
	@IsUUID('all', { each: true })
	taskIds: string[]
}
