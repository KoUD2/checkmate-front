import {
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  ValidateIf,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { TaskFormat, ExamSection, AiTaskType } from '@prisma/client'

export class ExamTaskOptionDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  optionText: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  matchText?: string

  @ApiProperty()
  @IsBoolean()
  isCorrect: boolean
}

export class CreateExamTaskDto {
  @ApiProperty({ enum: TaskFormat })
  @IsEnum(TaskFormat)
  format: TaskFormat

  @ApiProperty({ enum: ExamSection })
  @IsEnum(ExamSection)
  section: ExamSection

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  body?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  audioUrl?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  source?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  explanation?: string

  @ApiPropertyOptional()
  @ValidateIf(
    (o) =>
      o.format === TaskFormat.TRUE_FALSE ||
      o.format === TaskFormat.OPEN_CLOZE ||
      o.format === TaskFormat.WORD_FORMATION,
  )
  @IsString()
  @IsNotEmpty()
  correctAnswer?: string

  @ApiPropertyOptional({ enum: AiTaskType })
  @ValidateIf((o) => o.format === TaskFormat.AI_CHECK)
  @IsEnum(AiTaskType)
  @IsNotEmpty()
  aiTaskType?: AiTaskType

  @ApiPropertyOptional({ type: [ExamTaskOptionDto] })
  @ValidateIf(
    (o) => o.format === TaskFormat.MCQ || o.format === TaskFormat.MATCHING,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamTaskOptionDto)
  options?: ExamTaskOptionDto[]
}
