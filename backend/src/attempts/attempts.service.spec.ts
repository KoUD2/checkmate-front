import { NotFoundException, BadRequestException } from '@nestjs/common'
import { AttemptsService } from './attempts.service'

describe('AttemptsService', () => {
	let prisma: any;
	let service: AttemptsService;

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
		service = new AttemptsService(prisma as any);
	});

	it('getOrCreateAttempt() creates new IN_PROGRESS attempt when none exists (ATTEMPT-01)', async () => {
		prisma.variantAttempt.findFirst.mockResolvedValue(null);
		prisma.variant.findFirst.mockResolvedValue({ id: 'v1', published: true });
		prisma.variantAttempt.create.mockResolvedValue({ id: 'a1', userId: 'u1', variantId: 'v1', status: 'IN_PROGRESS', answers: [] });

		const result = await service.getOrCreateAttempt('u1', 'v1');

		expect(prisma.variantAttempt.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: { userId: 'u1', variantId: 'v1', status: 'IN_PROGRESS' }, include: { answers: true } }),
		);
		expect(result.id).toBe('a1');
	});

	it('getOrCreateAttempt() returns existing IN_PROGRESS attempt + answers when one exists (ATTEMPT-02)', async () => {
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', variantId: 'v1', status: 'IN_PROGRESS', answers: [{ id: 'ans1', examTaskId: 't1', content: 'x' }] });

		const result = await service.getOrCreateAttempt('u1', 'v1');

		expect(prisma.variantAttempt.create).not.toHaveBeenCalled();
		expect(result.answers).toHaveLength(1);
	});

	it('upsertAnswer() upserts on variantAttemptId_examTaskId unique index (ATTEMPT-04)', async () => {
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS' });
		prisma.attemptAnswer.upsert.mockResolvedValue({ id: 'ans1', content: 'hi' });

		await service.upsertAnswer('a1', 't1', 'u1', 'hi');

		expect(prisma.attemptAnswer.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { variantAttemptId_examTaskId: { variantAttemptId: 'a1', examTaskId: 't1' } },
				create: expect.objectContaining({ content: 'hi' }),
				update: expect.objectContaining({ content: 'hi' }),
			}),
		);
	});

	it('upsertAnswer() throws NotFoundException when attempt belongs to a different user (IDOR)', async () => {
		prisma.variantAttempt.findFirst.mockResolvedValue(null);

		await expect(service.upsertAnswer('a1', 't1', 'u-other', 'hi')).rejects.toBeInstanceOf(NotFoundException);
		expect(prisma.attemptAnswer.upsert).not.toHaveBeenCalled();
	});

	it('skipSection() toggles section in/out of skippedSections array using read-compute-write (ATTEMPT-06)', async () => {
		// Sub-case 5a: skip=true on empty array
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS', skippedSections: [] });
		prisma.variantAttempt.update.mockResolvedValue({ id: 'a1' });

		await service.skipSection('a1', 'u1', 'WRITING' as any, true);
		expect(prisma.variantAttempt.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ skippedSections: ['WRITING'] }) }),
		);

		jest.clearAllMocks();

		// Sub-case 5b: skip=false removes section
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS', skippedSections: ['WRITING'] });
		prisma.variantAttempt.update.mockResolvedValue({ id: 'a1' });

		await service.skipSection('a1', 'u1', 'WRITING' as any, false);
		expect(prisma.variantAttempt.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ skippedSections: [] }) }),
		);

		jest.clearAllMocks();

		// Sub-case 5c: invalid section throws BadRequestException
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS', skippedSections: [] });

		await expect(service.skipSection('a1', 'u1', 'LISTENING' as any, true)).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.variantAttempt.update).not.toHaveBeenCalled();
	});

	it('incrementPlay() returns playCount=1 on first call, then 2 on second, then throws BadRequestException at limit (ATTEMPT-07)', async () => {
		// Sub-case 1: first play
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS' });
		prisma.attemptAnswer.findUnique.mockResolvedValue(null);
		prisma.attemptAnswer.upsert.mockResolvedValue({ playCount: 1 });

		const result1 = await service.incrementPlay('a1', 't1', 'u1');
		expect(result1).toEqual({ playCount: 1 });

		jest.clearAllMocks();

		// Sub-case 2: second play
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS' });
		prisma.attemptAnswer.findUnique.mockResolvedValue({ playCount: 1 });
		prisma.attemptAnswer.upsert.mockResolvedValue({ playCount: 2 });

		const result2 = await service.incrementPlay('a1', 't1', 'u1');
		expect(result2).toEqual({ playCount: 2 });

		jest.clearAllMocks();

		// Sub-case 3: limit exceeded
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS' });
		prisma.attemptAnswer.findUnique.mockResolvedValue({ playCount: 2 });

		await expect(service.incrementPlay('a1', 't1', 'u1')).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.attemptAnswer.upsert).not.toHaveBeenCalled();
	});

	it('submit() sets status=SUBMITTED and endedAt=now() and rejects already-submitted attempts (ATTEMPT-09)', async () => {
		// Sub-case happy path
		prisma.variantAttempt.findFirst.mockResolvedValue({ id: 'a1', userId: 'u1', status: 'IN_PROGRESS' });
		prisma.variantAttempt.update.mockResolvedValue({ id: 'a1', status: 'SUBMITTED', endedAt: new Date() });

		await service.submit('a1', 'u1');
		expect(prisma.variantAttempt.update).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { status: 'SUBMITTED', endedAt: expect.any(Date) },
			}),
		);

		jest.clearAllMocks();

		// Sub-case already submitted: findFirst returns null (status filter excludes SUBMITTED)
		prisma.variantAttempt.findFirst.mockResolvedValue(null);

		await expect(service.submit('a1', 'u1')).rejects.toBeInstanceOf(NotFoundException);
	});
});
