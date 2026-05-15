import { BadRequestException } from '@nestjs/common'
import { VariantsService } from './variants.service'

describe('VariantsService', () => {
	let prisma: any;
	let service: VariantsService;

	beforeEach(() => {
		prisma = {
			variant: {
				findUnique: jest.fn(),
				findMany: jest.fn(),
				count: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				delete: jest.fn(),
			},
			variantTask: {
				findMany: jest.fn(),
				deleteMany: jest.fn(),
				createMany: jest.fn(),
			},
			examTask: {
				findMany: jest.fn(),
				findUnique: jest.fn(),
			},
			$transaction: jest.fn().mockImplementation((ops) => Promise.all(ops)),
		};
		service = new VariantsService(prisma as any);
	});

	it('assignTasks() executes $transaction([deleteMany, createMany]) with positions 1.0, 2.0, 3.0 from taskIds order (VARIANT-02)', async () => {
		prisma.variant.findUnique.mockResolvedValue({ id: 'v1', variantTasks: [] });
		prisma.variantTask.deleteMany.mockResolvedValue({ count: 0 });
		prisma.variantTask.createMany.mockResolvedValue({ count: 3 });

		await service.assignTasks('v1', ['t1', 't2', 't3']);

		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(prisma.variantTask.createMany).toHaveBeenCalledWith({
			data: [
				{ variantId: 'v1', examTaskId: 't1', position: 1.0 },
				{ variantId: 'v1', examTaskId: 't2', position: 2.0 },
				{ variantId: 'v1', examTaskId: 't3', position: 3.0 },
			],
		});
	});

	it('assignTasks() throws BadRequestException when taskIds contains duplicates (VARIANT-02)', async () => {
		prisma.variant.findUnique.mockResolvedValue({ id: 'v1', variantTasks: [] });

		try {
			await service.assignTasks('v1', ['t1', 't2', 't1']);
			fail('Expected BadRequestException to be thrown');
		} catch (error) {
			expect(error).toBeInstanceOf(BadRequestException);
			const response = (error as BadRequestException).getResponse();
			const message = typeof response === 'string' ? response : (response as any).message;
			expect(message).toContain('duplicate');
		}

		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('update() sets published=true and returns variant (VARIANT-03)', async () => {
		prisma.variant.findUnique.mockResolvedValue({ id: 'v1', published: false, variantTasks: [] });
		prisma.variant.update.mockResolvedValue({ id: 'v1', published: true });

		const result = await service.update('v1', { published: true });

		expect(prisma.variant.update).toHaveBeenCalledWith({
			where: { id: 'v1' },
			data: { published: true },
		});
		expect(result).toMatchObject({ id: 'v1' });
	});

	it('listPublished() builds where: { published: true } and returns items + total + totalPages (VARIANT-04)', async () => {
		prisma.variant.findMany.mockResolvedValue([{ id: 'v1' }, { id: 'v2' }]);
		prisma.variant.count.mockResolvedValue(2);

		const result = await service.listPublished(1, 20);

		expect(prisma.variant.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { published: true } }),
		);
		expect(prisma.variant.count).toHaveBeenCalledWith({ where: { published: true } });
		expect(result).toEqual({
			items: [{ id: 'v1' }, { id: 'v2' }],
			total: 2,
			totalPages: 1,
		});
	});

	it('getById() includes variantTasks orderBy position asc with examTask (VARIANT-05)', async () => {
		prisma.variant.findUnique.mockResolvedValue({
			id: 'v1',
			variantTasks: [{ position: 1.0, examTask: { id: 'e1' } }],
		});

		const result = await service.getById('v1');

		expect(prisma.variant.findUnique).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'v1' },
				include: expect.objectContaining({
					variantTasks: expect.objectContaining({
						orderBy: { position: 'asc' },
						include: { examTask: true },
					}),
				}),
			}),
		);
		expect(result).toMatchObject({ id: 'v1' });
	});
});
