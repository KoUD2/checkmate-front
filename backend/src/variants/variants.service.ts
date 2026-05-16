import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CreateVariantDto } from './dto/create-variant.dto'
import { UpdateVariantDto } from './dto/update-variant.dto'

@Injectable()
export class VariantsService {
	constructor(private prisma: PrismaService) {}

	private async findById(id: string) {
		const variant = await this.prisma.variant.findUnique({
			where: { id },
			include: {
				variantTasks: {
					orderBy: { position: 'asc' },
					include: { examTask: true },
				},
			},
		})
		if (!variant) throw new NotFoundException('Вариант не найден')
		return variant
	}

	async getById(id: string) {
		return this.findById(id)
	}

	async getPublishedById(id: string) {
		const variant = await this.prisma.variant.findFirst({
			where: { id, published: true },
			include: {
				variantTasks: {
					orderBy: { position: 'asc' },
					include: { examTask: { include: { options: true } } },
				},
			},
		})
		if (!variant) throw new NotFoundException('Вариант не найден')
		return variant
	}

	async adminList(page = 1, limit = 20) {
		const [items, total] = await Promise.all([
			this.prisma.variant.findMany({
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
				include: {
					variantTasks: {
						include: {
							examTask: { select: { section: true, format: true } },
						},
					},
					_count: { select: { variantTasks: true } },
				},
			}),
			this.prisma.variant.count(),
		])
		return { items, total, totalPages: Math.ceil(total / limit) }
	}

	async listPublished(page = 1, limit = 20) {
		const [items, total] = await Promise.all([
			this.prisma.variant.findMany({
				where: { published: true },
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
				include: {
					variantTasks: {
						include: {
							examTask: { select: { section: true, format: true } },
						},
					},
					_count: { select: { variantTasks: true } },
				},
			}),
			this.prisma.variant.count({ where: { published: true } }),
		])
		return { items, total, totalPages: Math.ceil(total / limit) }
	}

	async create(dto: CreateVariantDto) {
		return this.prisma.variant.create({
			data: {
				title: dto.title,
				description: dto.description,
				published: dto.published ?? false,
			},
		})
	}

	async update(id: string, dto: UpdateVariantDto) {
		await this.findById(id)
		await this.prisma.variant.update({ where: { id }, data: dto })
		return this.findById(id)
	}

	async assignTasks(variantId: string, taskIds: string[]) {
		await this.findById(variantId)
		if (new Set(taskIds).size !== taskIds.length) {
			throw new BadRequestException('taskIds contains duplicate entries')
		}
		await this.prisma.$transaction([
			this.prisma.variantTask.deleteMany({ where: { variantId } }),
			this.prisma.variantTask.createMany({
				data: taskIds.map((examTaskId, i) => ({
					variantId,
					examTaskId,
					position: i + 1.0,
				})),
			}),
		])
		return this.findById(variantId)
	}

	async remove(id: string) {
		await this.findById(id)
		await this.prisma.variant.delete({ where: { id } })
		return { deleted: true }
	}
}
