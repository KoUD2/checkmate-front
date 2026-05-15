import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsUUID, ArrayNotEmpty } from 'class-validator'

export class AssignTasksDto {
	@ApiProperty({ type: [String] })
	@IsArray()
	@ArrayNotEmpty()
	@IsUUID('all', { each: true })
	taskIds: string[]
}
