import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTask41Dto {
  @ApiProperty({ description: 'Аудиозапись ответа в base64' })
  @IsString()
  @MinLength(10, { message: 'Аудиозапись не может быть пустой' })
  audioBase64: string;

  @ApiProperty({ description: 'Оригинальное имя аудиофайла (для определения формата)', required: false })
  @IsOptional()
  @IsString()
  audioFileName?: string;

  @ApiProperty({ description: '5 вопросов интервьюера', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questions?: string[];
}
