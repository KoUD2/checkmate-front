// TODO(plan-03): import { CreateVariantDto } from './dto/create-variant.dto'
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';

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
	it.todo('CreateVariantDto rejects missing title (VARIANT-01)');
	it.todo('AssignTasksDto rejects non-UUID entries in taskIds array (VARIANT-02)');
	it.todo('RolesGuard blocks USER role on @Roles(Role.ADMIN) variants routes (VARIANT-03)');
});
