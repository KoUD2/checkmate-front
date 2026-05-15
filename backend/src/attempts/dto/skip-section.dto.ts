import { ApiProperty } from '@nestjs/swagger'
import { IsEnum, IsBoolean } from 'class-validator'
import { ExamSection } from '@prisma/client'

export class SkipSectionDto {
	@ApiProperty({ enum: ExamSection })
	@IsEnum(ExamSection)
	section: ExamSection

	@ApiProperty()
	@IsBoolean()
	skip: boolean
}
