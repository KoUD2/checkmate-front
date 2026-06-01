import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeMetrics, MetricsResponse, RawPayment } from './lib/metrics';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getMetrics(fromStr?: string, toStr?: string): Promise<MetricsResponse> {
    const to = toStr ? new Date(toStr) : new Date();
    const from = fromStr
      ? new Date(fromStr)
      : new Date(to.getTime() - 8 * 7 * 86400000); // default: last 8 weeks
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new BadRequestException('Некорректные параметры from/to');
    }
    if (from.getTime() > to.getTime()) {
      throw new BadRequestException('from должно быть раньше to');
    }

    // We fetch ALL rows (not just the window): coverage reconstruction needs each
    // user's full payment history so historical week-end coverage is correct.
    const [users, tasks, payments] = await Promise.all([
      this.prisma.user.findMany({
        select: {
          id: true,
          createdAt: true,
          referredByCode: true,
          vkId: true,
          telegramId: true,
          yandexId: true,
          isInternal: true,
          segment: true,
        },
      }),
      this.prisma.task.findMany({
        select: {
          userId: true,
          solution: true,
          transcription: true,
          createdAt: true,
          userRating: true,
          totalScore: true,
        },
      }),
      this.prisma.payment.findMany({
        select: {
          userId: true,
          status: true,
          amount: true,
          daysToAdd: true,
          checksToAdd: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    const normalizedPayments: RawPayment[] = payments.map((p) => ({
      userId: p.userId,
      status: p.status,
      amount: Number(p.amount),
      daysToAdd: p.daysToAdd,
      checksToAdd: p.checksToAdd,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return computeMetrics(
      { users, tasks, payments: normalizedPayments },
      { from, to },
    );
  }
}
