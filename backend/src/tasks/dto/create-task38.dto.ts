import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTask38Dto {
  @ApiProperty({ description: 'Текст задания (условие)' })
  @IsString({ message: 'Условие задания должно быть строкой' })
  @MinLength(10, { message: 'Условие задания слишком короткое' })
  taskDescription: string;

  @ApiPropertyOptional({ description: 'Текст ответа пользователя' })
  @IsOptional()
  @IsString({ message: 'Работа ученика должна быть строкой' })
  solution?: string;

  @ApiPropertyOptional({ description: 'Изображение графика в base64 (без data:image/... prefix)' })
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @ApiPropertyOptional({ description: 'Фото работы ученика в base64 (без data:image/... prefix)' })
  @IsOptional()
  @IsString()
  solutionImageBase64?: string;
}
