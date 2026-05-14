import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
	private readonly logger = new Logger(StorageService.name);
	private readonly bucket: string;
	private readonly cdnBase: string;
	private readonly s3: S3Client;

	constructor(private configService: ConfigService) {
		const bucket = this.configService.get<string>('YOS_BUCKET');
		const endpoint = this.configService.get<string>('YOS_ENDPOINT') || 'https://storage.yandexcloud.net';
		const region = this.configService.get<string>('YOS_REGION') || 'ru-central1';
		const accessKeyId = this.configService.get<string>('YOS_ACCESS_KEY_ID');
		const secretAccessKey = this.configService.get<string>('YOS_SECRET_ACCESS_KEY');

		if (!bucket || !accessKeyId || !secretAccessKey) {
			throw new Error(
				'Missing required YOS environment variables: YOS_BUCKET, YOS_ACCESS_KEY_ID, YOS_SECRET_ACCESS_KEY',
			);
		}

		this.bucket = bucket;
		this.cdnBase = `${endpoint}/${bucket}`;

		this.s3 = new S3Client({
			region,
			endpoint,
			credentials: { accessKeyId, secretAccessKey },
			forcePathStyle: true,
		});
	}

	async getPresignedPutUrl(
		key: string,
		contentType: string,
		expiresIn = 300,
	): Promise<{ presignedUrl: string; cdnUrl: string }> {
		try {
			const command = new PutObjectCommand({
				Bucket: this.bucket,
				Key: key,
				ContentType: contentType,
			});

			const presignedUrl = await getSignedUrl(this.s3, command, { expiresIn });
			const cdnUrl = `${this.cdnBase}/${key}`;

			return { presignedUrl, cdnUrl };
		} catch (error) {
			this.logger.error('Ошибка при генерации presigned URL', error);
			throw new InternalServerErrorException(
				`Не удалось получить URL для загрузки: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
