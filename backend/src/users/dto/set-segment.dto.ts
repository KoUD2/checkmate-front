import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Segment } from '@prisma/client';

export class SetSegmentDto {
  @ApiProperty({ enum: Segment })
  @IsEnum(Segment)
  segment: Segment;
}
