import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { ExamSection } from '@prisma/client'

@Injectable()
export class AttemptsService {
	constructor(private prisma: PrismaService) {}

	async getOrCreateAttempt(userId: string, variantId: string) {
		const existing = await this.prisma.variantAttempt.findFirst({
			where: { userId, variantId, status: 'IN_PROGRESS' },
			include: { answers: true },
		})
		if (existing) return existing

		const variant = await this.prisma.variant.findFirst({
			where: { id: variantId, published: true },
		})
		if (!variant) throw new NotFoundException('Вариант не найден')

		return this.prisma.variantAttempt.create({
			data: { userId, variantId, status: 'IN_PROGRESS' },
			include: { answers: true },
		})
	}

	async upsertAnswer(attemptId: string, taskId: string, userId: string, content: any) {
		const attempt = await this.prisma.variantAttempt.findFirst({
			where: { id: attemptId, userId },
		})
		if (!attempt) throw new NotFoundException('Попытка не найдена')
		if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Попытка уже завершена')

		return this.prisma.attemptAnswer.upsert({
			where: { variantAttemptId_examTaskId: { variantAttemptId: attemptId, examTaskId: taskId } },
			create: { variantAttemptId: attemptId, examTaskId: taskId, content },
			update: { content },
		})
	}

	async incrementPlay(attemptId: string, taskId: string, userId: string): Promise<{ playCount: number }> {
		const attempt = await this.prisma.variantAttempt.findFirst({
			where: { id: attemptId, userId },
		})
		if (!attempt) throw new NotFoundException('Попытка не найдена')
		if (attempt.status !== 'IN_PROGRESS') throw new BadRequestException('Попытка уже завершена')

		const existing = await this.prisma.attemptAnswer.findUnique({
			where: { variantAttemptId_examTaskId: { variantAttemptId: attemptId, examTaskId: taskId } },
		})
		if (existing && existing.playCount >= 2) {
			throw new BadRequestException('Лимит воспроизведений достигнут')
		}

		const updated = await this.prisma.attemptAnswer.upsert({
			where: { variantAttemptId_examTaskId: { variantAttemptId: attemptId, examTaskId: taskId } },
			create: { variantAttemptId: attemptId, examTaskId: taskId, content: null, playCount: 1 },
			update: { playCount: { increment: 1 } },
		})
		return { playCount: updated.playCount }
	}

	async skipSection(attemptId: string, userId: string, section: ExamSection, skip: boolean) {
		const attempt = await this.prisma.variantAttempt.findFirst({
			where: { id: attemptId, userId, status: 'IN_PROGRESS' },
		})
		if (!attempt) throw new NotFoundException('Попытка не найдена')
		if (section !== 'WRITING' && section !== 'SPEAKING') {
			throw new BadRequestException('Раздел не может быть пропущен')
		}

		const current = (attempt.skippedSections ?? []) as ExamSection[]
		const updated = skip
			? Array.from(new Set([...current, section]))
			: current.filter(s => s !== section)

		return this.prisma.variantAttempt.update({
			where: { id: attemptId },
			data: { skippedSections: updated },
			include: { answers: true },
		})
	}

	async submit(attemptId: string, userId: string) {
		const attempt = await this.prisma.variantAttempt.findFirst({
			where: { id: attemptId, userId, status: 'IN_PROGRESS' },
		})
		if (!attempt) throw new NotFoundException('Попытка не найдена или уже завершена')

		return this.prisma.variantAttempt.update({
			where: { id: attemptId },
			data: { status: 'SUBMITTED', endedAt: new Date() },
			include: { answers: true },
		})
	}
}
