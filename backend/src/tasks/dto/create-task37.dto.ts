import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class CreateTask37Dto {
  @ApiProperty({ description: 'Текст задания (условие)' })
  @IsString({ message: 'Условие задания должно быть строкой' })
  @MinLength(10, { message: 'Условие задания слишком короткое' })
  taskDescription: string;

  @ApiProperty({ description: 'Текст письма / эссе пользователя' })
  @IsString({ message: 'Работа ученика должна быть строкой' })
  @MinLength(10, { message: 'Работа ученика должна содержать не менее 10 символов' })
  solution: string;
}
