import { IsString, IsEnum, IsBoolean, IsOptional, IsNotEmpty, IsObject } from 'class-validator'
import { ResourceType } from '@prisma/client'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateResourceDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  slug: string

  @ApiProperty({ enum: ResourceType })
  @IsEnum(ResourceType)
  type: ResourceType

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string

  @ApiProperty()
  @IsObject()
  content: object

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  published?: boolean

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoTitle?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoDescription?: string

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  seoKeywords?: string
}
