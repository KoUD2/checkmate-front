import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ example: 299, description: 'Сумма в рублях' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiProperty({ example: 30, description: 'Количество дней подписки' })
  @IsNumber()
  @Min(1)
  daysToAdd: number;

  @ApiProperty({ example: 50, description: 'Количество проверок' })
  @IsNumber()
  @Min(1)
  checksToAdd: number;
}
