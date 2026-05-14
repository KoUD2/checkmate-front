import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { TaskFormat, ExamSection, Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateExamTaskDto } from './dto/create-exam-task.dto'
import { UpdateExamTaskDto } from './dto/update-exam-task.dto'

@Injectable()
export class ExamTasksService {
  constructor(private prisma: PrismaService) {}

  async list(
    filters: { section?: ExamSection; format?: TaskFormat; source?: string },
    page = 1,
    limit = 20,
  ) {
    const where: Prisma.ExamTaskWhereInput = {
      ...(filters.section ? { section: filters.section } : {}),
      ...(filters.format ? { format: filters.format } : {}),
      ...(filters.source
        ? { source: { contains: filters.source, mode: 'insensitive' } }
        : {}),
    }
    const [items, total] = await Promise.all([
      this.prisma.examTask.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { options: true } } },
      }),
      this.prisma.examTask.count({ where }),
    ])
    return { items, total, totalPages: Math.ceil(total / limit) }
  }

  private async findById(id: string) {
    const task = await this.prisma.examTask.findUnique({
      where: { id },
      include: { options: true },
    })
    if (!task) throw new NotFoundException('Задание не найдено')
    return task
  }

  async getById(id: string) {
    return this.findById(id)
  }

  async create(dto: CreateExamTaskDto) {
    const { options, ...taskData } = dto
    return this.prisma.examTask.create({
      data: {
        ...taskData,
        ...(options && options.length > 0 ? { options: { create: options } } : {}),
      },
      include: { options: true },
    })
  }

  async update(id: string, dto: UpdateExamTaskDto) {
    await this.findById(id)
    const { options, ...taskData } = dto
    if (options !== undefined) {
      await this.prisma.$transaction([
        this.prisma.examTaskOption.deleteMany({ where: { examTaskId: id } }),
        this.prisma.examTask.update({
          where: { id },
          data: {
            ...taskData,
            options: { create: options },
          },
        }),
      ])
    } else {
      await this.prisma.examTask.update({ where: { id }, data: taskData })
    }
    return this.findById(id)
  }

  async remove(id: string, confirm = false) {
    await this.findById(id)

    const variantTasks = await this.prisma.variantTask.findMany({
      where: { examTaskId: id },
      include: { variant: { select: { id: true, title: true, published: true } } },
    })

    const publishedVariants = variantTasks.filter((vt) => vt.variant.published)
    if (publishedVariants.length > 0) {
      throw new ConflictException({
        message: 'Задание используется в опубликованных вариантах',
        variants: publishedVariants.map((vt) => vt.variant.title),
      })
    }

    const draftVariants = variantTasks.filter((vt) => !vt.variant.published)
    if (draftVariants.length > 0 && !confirm) {
      return {
        needsConfirm: true,
        variantNames: draftVariants.map((vt) => vt.variant.title),
      }
    }

    if (variantTasks.length > 0) {
      await this.prisma.$transaction([
        this.prisma.variantTask.deleteMany({ where: { examTaskId: id } }),
        this.prisma.examTask.delete({ where: { id } }),
      ])
    } else {
      await this.prisma.examTask.delete({ where: { id } })
    }

    return { deleted: true }
  }
}
