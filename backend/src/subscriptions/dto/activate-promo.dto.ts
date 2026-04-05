import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ActivatePromoDto {
  @ApiProperty({ example: 'PROMO2024' })
  @IsString()
  @MinLength(1)
  code: string;
}
