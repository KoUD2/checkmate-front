import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CancelReason, Segment } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) throw new NotFoundException('Пользователь не найден');

    const { passwordHash, ...rest } = user;
    return rest;
  }

  async setSegment(userId: string, segment: Segment) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { segment },
    });
    return { segment };
  }

  async createCancelFeedback(
    userId: string,
    reason: CancelReason,
    comment?: string,
  ) {
    await this.prisma.cancelFeedback.create({
      data: { userId, reason, comment: comment ?? null },
    });
    return { ok: true };
  }
}
