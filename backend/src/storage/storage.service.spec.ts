import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: jest.fn().mockResolvedValue(
		'https://storage.yandexcloud.net/test-bucket/audio/x.mp3?X-Amz-Signature=stub',
	),
}));

jest.mock('@aws-sdk/client-s3', () => ({
	S3Client: jest.fn().mockImplementation(() => ({})),
	PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

function makeConfigService(overrides: Record<string, string> = {}): ConfigService {
	const defaults: Record<string, string> = {
		YOS_BUCKET: 'test-bucket',
		YOS_ENDPOINT: 'https://storage.yandexcloud.net',
		YOS_REGION: 'ru-central1',
		YOS_ACCESS_KEY_ID: 'ak',
		YOS_SECRET_ACCESS_KEY: 'sk',
	};
	const values = { ...defaults, ...overrides };
	return { get: (key: string) => values[key] ?? null } as unknown as ConfigService;
}

describe('StorageService', () => {
	it('getPresignedPutUrl returns presignedUrl and cdnUrl strings', async () => {
		const service = new StorageService(makeConfigService());
		const result = await service.getPresignedPutUrl('audio/x.mp3', 'audio/mpeg');

		expect(result).toEqual({
			presignedUrl: expect.any(String),
			cdnUrl: 'https://storage.yandexcloud.net/test-bucket/audio/x.mp3',
		});
	});

	it('getPresignedPutUrl uses expiresIn=300 by default', async () => {
		const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
		const service = new StorageService(makeConfigService());
		await service.getPresignedPutUrl('audio/x.mp3', 'audio/mpeg');

		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ expiresIn: 300 }),
		);
	});

	it('passes ContentType through to PutObjectCommand', async () => {
		const { PutObjectCommand } = require('@aws-sdk/client-s3');
		(PutObjectCommand as jest.Mock).mockClear();

		const service = new StorageService(makeConfigService());
		await service.getPresignedPutUrl('k', 'audio/mpeg');

		expect(PutObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				ContentType: 'audio/mpeg',
				Bucket: 'test-bucket',
				Key: 'k',
			}),
		);
	});
});
