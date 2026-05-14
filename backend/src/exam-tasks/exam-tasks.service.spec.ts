import { ConflictException } from '@nestjs/common';
import { TaskFormat, ExamSection } from '@prisma/client';
import { ExamTasksService } from './exam-tasks.service';

describe('ExamTasksService', () => {
	let prisma: any;
	let service: ExamTasksService;

	beforeEach(() => {
		prisma = {
			examTask: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				count: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
			},
			examTaskOption: {
				deleteMany: jest.fn(),
			},
			variantTask: {
				findMany: jest.fn(),
				deleteMany: jest.fn(),
			},
			$transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
		};
		service = new ExamTasksService(prisma as any);
	});

	it('remove() throws ConflictException listing variant titles when task is in a published variant (TASK-04)', async () => {
		prisma.examTask.findUnique.mockResolvedValue({ id: 'task-1', title: 'Test Task', options: [] });
		prisma.variantTask.findMany.mockResolvedValue([
			{ variant: { id: 'v1', title: 'Опубликованный вариант', published: true } },
		]);

		try {
			await service.remove('task-1');
			fail('Expected ConflictException to be thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(ConflictException);
			expect((e as ConflictException).getResponse()).toMatchObject({
				message: 'Задание используется в опубликованных вариантах',
				variants: expect.arrayContaining(['Опубликованный вариант']),
			});
		}
	});

	it('remove() returns { needsConfirm: true, variantNames: [...] } when only draft variants reference the task and confirm is falsy (TASK-04)', async () => {
		prisma.examTask.findUnique.mockResolvedValue({ id: 'task-1', title: 'Test Task', options: [] });
		prisma.variantTask.findMany.mockResolvedValue([
			{ variant: { id: 'v1', title: 'Черновик 1', published: false } },
			{ variant: { id: 'v2', title: 'Черновик 2', published: false } },
		]);

		await expect(service.remove('task-1')).resolves.toEqual({
			needsConfirm: true,
			variantNames: ['Черновик 1', 'Черновик 2'],
		});

		expect(prisma.$transaction).not.toHaveBeenCalled();
		expect(prisma.examTask.delete).not.toHaveBeenCalled();
	});

	it('remove() executes prisma.$transaction([deleteMany variantTask, delete examTask]) when confirm=true and only draft variants exist (TASK-04)', async () => {
		prisma.examTask.findUnique.mockResolvedValue({ id: 'task-1', title: 'Test Task', options: [] });
		prisma.variantTask.findMany.mockResolvedValue([
			{ variant: { id: 'v1', title: 'Черновик 1', published: false } },
			{ variant: { id: 'v2', title: 'Черновик 2', published: false } },
		]);
		prisma.variantTask.deleteMany.mockResolvedValue({ count: 2 });
		prisma.examTask.delete.mockResolvedValue({ id: 'task-1' });

		await service.remove('task-1', true);

		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Array));
		expect(prisma.examTask.delete).not.toHaveBeenCalledWith(
			expect.not.objectContaining({}),
		);
	});

	it('list() builds Prisma where clause with section, format, and source contains+insensitive filters (TASK-06)', async () => {
		prisma.examTask.findMany.mockResolvedValue([]);
		prisma.examTask.count.mockResolvedValue(0);

		await service.list({ section: ExamSection.READING, format: TaskFormat.MCQ, source: 'фипи' }, 2, 10);

		expect(prisma.examTask.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					section: 'READING',
					format: 'MCQ',
					source: { contains: 'фипи', mode: 'insensitive' },
				},
				skip: 10,
				take: 10,
			}),
		);
	});
});
