import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CancelReason } from '@prisma/client';

export class CancelFeedbackDto {
  @ApiProperty({ enum: CancelReason })
  @IsEnum(CancelReason)
  reason: CancelReason;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
