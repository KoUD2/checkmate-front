import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTask42Dto {
  @ApiProperty({ description: 'Аудиозапись ответа в base64' })
  @IsString()
  @MinLength(10, { message: 'Аудиозапись не может быть пустой' })
  audioBase64: string;

  @ApiProperty({ description: 'Оригинальное имя аудиофайла (для определения формата)', required: false })
  @IsOptional()
  @IsString()
  audioFileName?: string;

  @ApiProperty({ description: 'Текст задания (первый абзац)', required: false })
  @IsOptional()
  @IsString()
  taskText?: string;

  @ApiProperty({ description: '3 переменных пункта задания (аспекты 2–4)', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bullets?: string[];

  @ApiProperty({ description: 'Иллюстрация 1 в base64 (без data URI префикса)', required: false })
  @IsOptional()
  @IsString()
  image1Base64?: string;

  @ApiProperty({ description: 'Иллюстрация 2 в base64 (без data URI префикса)', required: false })
  @IsOptional()
  @IsString()
  image2Base64?: string;
}
