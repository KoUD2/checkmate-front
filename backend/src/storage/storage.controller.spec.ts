import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
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

function makeGuardWithAdminRole(): RolesGuard {
	const reflector = new Reflector();
	jest.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
		if (key === ROLES_KEY) return [Role.ADMIN];
		return undefined;
	});
	return new RolesGuard(reflector);
}

describe('StorageController', () => {
	it('RolesGuard.canActivate throws ForbiddenException for USER on @Roles(Role.ADMIN) route', () => {
		const guard = makeGuardWithAdminRole();
		expect(() => guard.canActivate(makeMockContext(Role.USER))).toThrow(ForbiddenException);
	});

	it('RolesGuard.canActivate returns true for ADMIN on @Roles(Role.ADMIN) route', () => {
		const guard = makeGuardWithAdminRole();
		expect(guard.canActivate(makeMockContext(Role.ADMIN))).toBe(true);
	});

	it('rejects contentType not in allowed audio types via PresignRequestDto', async () => {
		const dto = plainToInstance(PresignRequestDto, { fileName: 'audio/a.mp3', contentType: 'audio/ogg' });
		const errors = await validate(dto);

		expect(errors.length).toBeGreaterThanOrEqual(1);
		const contentTypeError = errors.find((e) => e.property === 'contentType');
		expect(contentTypeError).toBeDefined();
		expect(contentTypeError!.constraints!['matches']).toBeDefined();
	});

	it('accepts contentType audio/mpeg via PresignRequestDto', async () => {
		const dto = plainToInstance(PresignRequestDto, { fileName: 'audio/a.mp3', contentType: 'audio/mpeg' });
		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
	});

	it('accepts contentType audio/3gpp via PresignRequestDto', async () => {
		const dto = plainToInstance(PresignRequestDto, { fileName: 'audio/a.3gpp', contentType: 'audio/3gpp' });
		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
	});

	it('accepts contentType audio/mp4 via PresignRequestDto', async () => {
		const dto = plainToInstance(PresignRequestDto, { fileName: 'audio/a.m4a', contentType: 'audio/mp4' });
		const errors = await validate(dto);

		expect(errors).toHaveLength(0);
	});

	it('rejects fileName with path traversal via PresignRequestDto', async () => {
		const dto = plainToInstance(PresignRequestDto, { fileName: '../../etc/passwd', contentType: 'audio/mpeg' });
		const errors = await validate(dto);

		expect(errors.length).toBeGreaterThanOrEqual(1);
		const fileNameError = errors.find((e) => e.property === 'fileName');
		expect(fileNameError).toBeDefined();
		expect(fileNameError!.constraints!['matches']).toBeDefined();
	});
});
