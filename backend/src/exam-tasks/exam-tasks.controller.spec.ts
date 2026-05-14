import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RolesGuard } from '../common/guards/roles.guard';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import { CreateExamTaskDto } from './dto/create-exam-task.dto';
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

describe('ExamTasksController', () => {
	it('CreateExamTaskDto rejects missing options when format=MCQ (TASK-01)', async () => {
		const dto = plainToInstance(CreateExamTaskDto, {
			format: 'MCQ',
			section: 'READING',
			title: 'Sample MCQ',
			body: 'Text',
		});
		const errors = await validate(dto);
		expect(errors.length).toBeGreaterThanOrEqual(1);
		const optionsError = errors.find((e) => e.property === 'options');
		expect(optionsError).toBeDefined();
	});

	it('CreateExamTaskDto rejects missing aiTaskType when format=AI_CHECK (TASK-02)', async () => {
		const dto = plainToInstance(CreateExamTaskDto, {
			format: 'AI_CHECK',
			section: 'WRITING',
			title: 'AI essay',
		});
		const errors = await validate(dto);
		expect(errors.length).toBeGreaterThanOrEqual(1);
		const aiTaskTypeError = errors.find((e) => e.property === 'aiTaskType');
		expect(aiTaskTypeError).toBeDefined();
	});

	it('CreateExamTaskDto rejects missing correctAnswer when format=OPEN_CLOZE (TASK-01)', async () => {
		const dto = plainToInstance(CreateExamTaskDto, {
			format: 'OPEN_CLOZE',
			section: 'GRAMMAR',
			title: 'Cloze',
		});
		const errors = await validate(dto);
		expect(errors.length).toBeGreaterThanOrEqual(1);
		const correctAnswerError = errors.find((e) => e.property === 'correctAnswer');
		expect(correctAnswerError).toBeDefined();
	});

	it('RolesGuard blocks USER role on @Roles(Role.ADMIN) routes (TASK-06)', () => {
		const guard = makeGuardWithAdminRole();
		expect(() => guard.canActivate(makeMockContext(Role.USER))).toThrow(ForbiddenException);
		expect(guard.canActivate(makeMockContext(Role.ADMIN))).toBe(true);
	});
});
