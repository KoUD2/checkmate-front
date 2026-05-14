import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class PresignRequestDto {
	@ApiProperty({ example: 'audio/task-001.mp3', description: 'S3 key (path within bucket) for the upload' })
	@IsString()
	@IsNotEmpty()
	fileName: string;

	@ApiProperty({ example: 'audio/mpeg', description: 'MIME type — only audio/mpeg accepted' })
	@IsString()
	@Matches(/^audio\/mpeg$/, { message: 'contentType must be audio/mpeg' })
	contentType: string;
}
