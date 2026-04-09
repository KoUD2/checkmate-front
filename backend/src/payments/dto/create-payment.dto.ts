import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 299, description: 'Сумма в рублях' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 0, description: 'Количество дней подписки (0 = бессрочный пакет)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  daysToAdd?: number;

  @ApiProperty({ example: 50, description: 'Количество проверок' })
  @IsNumber()
  @Min(1)
  checksToAdd: number;
}
