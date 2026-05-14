import { PartialType } from '@nestjs/swagger'
import { CreateExamTaskDto } from './create-exam-task.dto'

export class UpdateExamTaskDto extends PartialType(CreateExamTaskDto) {}
