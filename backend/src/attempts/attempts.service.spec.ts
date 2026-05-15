// TODO(plan-02): import { AttemptsService } from './attempts.service'

describe('AttemptsService', () => {
	let prisma: any;
	// TODO(plan-02): let service: AttemptsService

	beforeEach(() => {
		prisma = {
			variantAttempt: {
				findFirst: jest.fn(),
				findUnique: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
			attemptAnswer: {
				findUnique: jest.fn(),
				upsert: jest.fn(),
			},
			variant: {
				findFirst: jest.fn(),
			},
		};
	});

	it.todo('getOrCreateAttempt() creates new IN_PROGRESS attempt when none exists (ATTEMPT-01)');
	it.todo('getOrCreateAttempt() returns existing IN_PROGRESS attempt + answers when one exists (ATTEMPT-02)');
	it.todo('upsertAnswer() upserts on variantAttemptId_examTaskId unique index (ATTEMPT-04)');
	it.todo('upsertAnswer() throws NotFoundException when attempt belongs to a different user (IDOR)');
	it.todo('skipSection() toggles section in/out of skippedSections array using read-compute-write (ATTEMPT-06)');
	it.todo('incrementPlay() returns playCount=1 on first call, then 2 on second, then throws BadRequestException at limit (ATTEMPT-07)');
	it.todo('submit() sets status=SUBMITTED and endedAt=now() and rejects already-submitted attempts (ATTEMPT-09)');
});
