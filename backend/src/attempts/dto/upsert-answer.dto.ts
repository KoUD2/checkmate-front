import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional } from 'class-validator'

export class UpsertAnswerDto {
	@ApiPropertyOptional()
	@IsOptional()
	content: any
}
