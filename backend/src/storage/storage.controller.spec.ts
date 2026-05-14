import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { PresignRequestDto } from './dto/presign-request.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

function makeMockContext(userRole: Role): ExecutionContext {
	return {
		getHandler: jest.fn(),
		getClass: jest.fn(),
		switchToHttp: () => ({
			getRequest: () => ({ user: { role: userRole } }),
		}),
	} as unknown as ExecutionContext;
}

describe('StorageController', () => {
	it('RolesGuard.canActivate returns false for USER on @Roles(Role.ADMIN) route', () => {
		const reflector = new Reflector();
		jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
			if (key === ROLES_KEY) return [Role.ADMIN];
			return undefined;
		});

		const guard = new RolesGuard(reflector);
		const ctx = makeMockContext(Role.USER);

		expect(() => guard.canActivate(ctx)).toThrow();
	});

	it('rejects contentType other than audio/mpeg via PresignRequestDto', async () => {
		const dto = plainToInstance(PresignRequestDto, { fileName: 'a.mp3', contentType: 'audio/wav' });
		const errors = await validate(dto);

		expect(errors.length).toBeGreaterThanOrEqual(1);
		const contentTypeError = errors.find((e) => e.property === 'contentType');
		expect(contentTypeError).toBeDefined();
		expect(contentTypeError!.constraints!['matches']).toBeDefined();
	});

	it('accepts contentType audio/mpeg via PresignRequestDto', async () => {
		const dto = plainToInstance(PresignRequestDto, { fileName: 'a.mp3', contentType: 'audio/mpeg' });
		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
	});
});
