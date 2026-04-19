import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTask40Dto {
  @ApiProperty({ description: 'Изображение рекламы в base64', required: false })
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @ApiProperty({ description: 'Аудиозапись ответа в base64' })
  @IsString()
  @MinLength(10, { message: 'Аудиозапись не может быть пустой' })
  audioBase64: string;

  @ApiProperty({ description: 'Оригинальное имя аудиофайла (для определения формата)', required: false })
  @IsOptional()
  @IsString()
  audioFileName?: string;

  @ApiProperty({ description: '4 темы вопросов из задания', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  questions?: string[];
}
