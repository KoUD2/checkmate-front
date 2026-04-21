import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TaskType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import { CreateTask37Dto } from './dto/create-task37.dto';
import { CreateTask38Dto } from './dto/create-task38.dto';
import { CreateTask39Dto } from './dto/create-task39.dto';
import { CreateTask40Dto } from './dto/create-task40.dto';
import { CreateTask41Dto } from './dto/create-task41.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private gemini: GeminiService,
  ) {}

  async submitTask37(userId: string, dto: CreateTask37Dto) {
    if (!dto.solution?.trim() && !dto.solutionImageBase64) {
      throw new BadRequestException('Необходимо ввести текст работы или загрузить фото ответа');
    }

    await this.checkAccess(userId);

    const result = await this.gemini.checkTask37(
      dto.taskDescription,
      dto.solution ?? '',
      dto.solutionImageBase64,
    );

    const [task] = await this.prisma.$transaction([
      this.prisma.task.create({
        data: {
          type: TaskType.TASK37,
          userId,
          taskDescription: dto.taskDescription,
          solution: dto.solution ?? '',
          solutionImageBase64: dto.solutionImageBase64,
          k1: result.k1,
          k2: result.k2,
          k3: result.k3,
          totalScore: result.totalScore,
          feedback: result.feedback as any,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { freeChecksLeft: { decrement: 1 } },
      }),
    ]);

    return task;
  }

  async submitTask38(userId: string, dto: CreateTask38Dto) {
    if (!dto.solution?.trim() && !dto.solutionImageBase64) {
      throw new BadRequestException('Необходимо ввести текст работы или загрузить фото ответа');
    }

    await this.checkAccess(userId);

    const result = await this.gemini.checkTask38(
      dto.taskDescription,
      dto.solution ?? '',
      dto.imageBase64,
      dto.solutionImageBase64,
    );

    const [task] = await this.prisma.$transaction([
      this.prisma.task.create({
        data: {
          type: TaskType.TASK38,
          userId,
          taskDescription: dto.taskDescription,
          solution: dto.solution ?? '',
          imageBase64: dto.imageBase64,
          solutionImageBase64: dto.solutionImageBase64,
          k1: result.k1,
          k2: result.k2,
          k3: result.k3,
          k4: result.k4,
          k5: result.k5,
          totalScore: result.totalScore,
          feedback: result.feedback as any,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { freeChecksLeft: { decrement: 1 } },
      }),
    ]);

    return task;
  }

  async submitTask39(userId: string, dto: CreateTask39Dto) {
    await this.checkAccess(userId);

    const result = await this.gemini.checkTask39(dto.taskText, dto.audioBase64, dto.audioFileName);

    const [task] = await this.prisma.$transaction([
      this.prisma.task.create({
        data: {
          type: TaskType.TASK39,
          userId,
          taskDescription: dto.taskText,
          solution: result.transcription,
          audioBase64: dto.audioBase64,
          transcription: result.transcription,
          k1: result.k1,
          totalScore: result.totalScore,
          feedback: result.feedback as any,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { freeChecksLeft: { decrement: 1 } },
      }),
    ]);

    return task;
  }

  async submitTask40(userId: string, dto: CreateTask40Dto) {
    await this.checkAccess(userId);

    const result = await this.gemini.checkTask40(dto.audioBase64, dto.audioFileName, dto.questions);

    const taskDescription = dto.questions && dto.questions.length > 0
      ? dto.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
      : '';

    const [task] = await this.prisma.$transaction([
      this.prisma.task.create({
        data: {
          type: TaskType.TASK40,
          userId,
          taskDescription,
          solution: result.transcription,
          imageBase64: dto.imageBase64,
          audioBase64: dto.audioBase64,
          transcription: result.transcription,
          k1: result.k1,
          k2: result.k2,
          k3: result.k3,
          k4: result.k4,
          totalScore: result.totalScore,
          feedback: result.feedback as any,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { freeChecksLeft: { decrement: 1 } },
      }),
    ]);

    return task;
  }

  async submitTask41(userId: string, dto: CreateTask41Dto) {
    await this.checkAccess(userId);

    const result = await this.gemini.checkTask41(dto.audioBase64, dto.audioFileName, dto.questions);

    const taskDescription = dto.questions && dto.questions.length > 0
      ? dto.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')
      : '';

    const [task] = await this.prisma.$transaction([
      this.prisma.task.create({
        data: {
          type: TaskType.TASK41,
          userId,
          taskDescription,
          solution: result.transcription,
          audioBase64: dto.audioBase64,
          transcription: result.transcription,
          k1: result.k1,
          k2: result.k2,
          k3: result.k3,
          k4: result.k4,
          k5: result.k5,
          totalScore: result.totalScore,
          feedback: result.feedback as any,
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { freeChecksLeft: { decrement: 1 } },
      }),
    ]);

    return task;
  }

  async getHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          type: true,
          taskDescription: true,
          solution: true,
          k1: true,
          k2: true,
          k3: true,
          k4: true,
          k5: true,
          totalScore: true,
          createdAt: true,
        },
      }),
      this.prisma.task.count({ where: { userId } }),
    ]);

    return {
      tasks,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        type: true,
        userId: true,
        taskDescription: true,
        solution: true,
        imageBase64: true,
        transcription: true,
        k1: true,
        k2: true,
        k3: true,
        k4: true,
        k5: true,
        totalScore: true,
        feedback: true,
        createdAt: true,
      },
    });
    if (!task) throw new NotFoundException('Задание не найдено');
    if (task.userId !== userId) throw new ForbiddenException('Нет доступа');
    return task;
  }

  private async checkAccess(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) throw new NotFoundException('Пользователь не найден');

    if (user.freeChecksLeft <= 0) {
      throw new ForbiddenException(
        'Исчерпан лимит проверок. Оформите подписку.',
      );
    }
  }

  private async decrementFreeCheck(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { freeChecksLeft: { decrement: 1 } },
    });
  }

  async synthesizeSpeech(text: string): Promise<string> {
    return this.gemini.synthesizeSpeech(text);
  }
}
