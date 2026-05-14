import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class PresignRequestDto {
	@ApiProperty({ example: 'audio/task-001.mp3', description: 'S3 key (path within bucket) for the upload' })
	@IsString()
	@IsNotEmpty()
	@Matches(/^[a-zA-Z0-9_\-]+\/[a-zA-Z0-9_\-\.]+$/, {
		message: 'fileName must be a safe S3 key in the form "prefix/filename.ext"',
	})
	fileName: string;

	@ApiProperty({ example: 'audio/mpeg', description: 'MIME type — supported audio types accepted' })
	@IsString()
	@Matches(/^audio\/(mpeg|mp4|3gpp|wav|webm)$/, { message: 'contentType must be a supported audio MIME type' })
	contentType: string;
}
