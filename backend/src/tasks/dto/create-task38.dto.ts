import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTask38Dto {
  @ApiProperty({ description: 'Текст задания (условие)' })
  @IsString({ message: 'Условие задания должно быть строкой' })
  @MinLength(10, { message: 'Условие задания слишком короткое' })
  taskDescription: string;

  @ApiProperty({ description: 'Текст ответа пользователя' })
  @IsString({ message: 'Работа ученика должна быть строкой' })
  @MinLength(10, { message: 'Работа ученика должна содержать не менее 10 символов' })
  solution: string;

  @ApiPropertyOptional({ description: 'Изображение графика в base64 (без data:image/... prefix)' })
  @IsOptional()
  @IsString()
  imageBase64?: string;
}
