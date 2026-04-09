import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail({}, { message: 'Некорректный email' })
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Пароль должен быть минимум 8 символов' })
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'Иван' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Иванов' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: 'Школа №1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  organization?: string;

  @ApiPropertyOptional({ example: 'abc12345' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  referredByCode?: string;
}
