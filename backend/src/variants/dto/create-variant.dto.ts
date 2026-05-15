import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator'

export class CreateVariantDto {
	@ApiProperty()
	@IsString()
	@IsNotEmpty()
	title: string

	@ApiPropertyOptional()
	@IsString()
	@IsOptional()
	description?: string

	@ApiPropertyOptional()
	@IsBoolean()
	@IsOptional()
	published?: boolean
}
