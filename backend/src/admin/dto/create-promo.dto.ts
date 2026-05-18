import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePromoDto {
  @ApiProperty({ example: 'SUMMER2024' })
  @IsString()
  @MinLength(3)
  code: string;

  @ApiProperty({ example: 10, description: 'Количество чеков' })
  @IsInt()
  @Min(1)
  checksToAdd: number;

  @ApiPropertyOptional({ example: 'Летняя акция' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 100, description: 'Макс. кол-во использований (null = ∞)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({ example: '2024-12-31', description: 'Дата истечения' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
