import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTask39Dto {
  @ApiProperty({ description: 'Текст задания для чтения вслух' })
  @IsString({ message: 'Текст задания должен быть строкой' })
  @MinLength(20, { message: 'Текст задания слишком короткий' })
  taskText: string;

  @ApiProperty({ description: 'Аудиозапись чтения в base64 (webm/mp4, без data:audio/... prefix)' })
  @IsString()
  @MinLength(10, { message: 'Аудиозапись не может быть пустой' })
  audioBase64: string;

  @ApiProperty({ description: 'Оригинальное имя файла (для определения формата)', required: false })
  @IsOptional()
  @IsString()
  audioFileName?: string;
}
