import { CreateVariantDto } from './dto/create-variant.dto';
import { AssignTasksDto } from './dto/assign-tasks.dto';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
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

describe('VariantsController', () => {
	it('CreateVariantDto rejects missing title (VARIANT-01)', async () => {
		const dto = plainToInstance(CreateVariantDto, {});
		const errors = await validate(dto);
		expect(errors.find((e) => e.property === 'title')).toBeDefined();
	});

	it('CreateVariantDto accepts { title: "Вариант 1" } (VARIANT-01)', async () => {
		const dto = plainToInstance(CreateVariantDto, { title: 'Вариант 1' });
		const errors = await validate(dto);
		expect(errors).toHaveLength(0);
	});

	it('CreateVariantDto rejects published when type is not boolean (VARIANT-03)', async () => {
		const dto = plainToInstance(CreateVariantDto, { title: 'X', published: 'yes' });
		const errors = await validate(dto);
		expect(errors.find((e) => e.property === 'published')).toBeDefined();
	});

	it('AssignTasksDto rejects non-UUID entries in taskIds array (VARIANT-02)', async () => {
		const dto = plainToInstance(AssignTasksDto, { taskIds: ['not-a-uuid'] });
		const errors = await validate(dto);
		expect(errors.find((e) => e.property === 'taskIds')).toBeDefined();
	});

	it('AssignTasksDto rejects non-array taskIds (VARIANT-02)', async () => {
		const dto = plainToInstance(AssignTasksDto, { taskIds: 'string-not-array' });
		const errors = await validate(dto);
		expect(errors.find((e) => e.property === 'taskIds')).toBeDefined();
	});

	it('AssignTasksDto accepts empty array (VARIANT-02)', async () => {
		const dto = plainToInstance(AssignTasksDto, { taskIds: [] });
		const errors = await validate(dto);
		expect(errors).toHaveLength(0);
	});

	it('AssignTasksDto accepts valid UUID array (VARIANT-02)', async () => {
		const dto = plainToInstance(AssignTasksDto, { taskIds: ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'] });
		const errors = await validate(dto);
		expect(errors).toHaveLength(0);
	});

	it('RolesGuard blocks USER role on @Roles(Role.ADMIN) variants admin routes (VARIANT-03)', () => {
		const guard = makeGuardWithAdminRole();
		expect(() => guard.canActivate(makeMockContext(Role.USER))).toThrow(ForbiddenException);
		expect(guard.canActivate(makeMockContext(Role.ADMIN))).toBe(true);
	});
});
