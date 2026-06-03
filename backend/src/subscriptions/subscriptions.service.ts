import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getMySubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return { isActive: false, expiresAt: null, churnSurveyPending: false };
    }

    const now = new Date();
    const lapsed = !!subscription.expiresAt && subscription.expiresAt < now;

    if (lapsed && subscription.isActive) {
      await this.prisma.subscription.update({
        where: { userId },
        data: { isActive: false },
      });
    }

    let churnSurveyPending = false;
    if (lapsed) {
      const answered = await this.prisma.cancelFeedback.findFirst({
        where: { userId, createdAt: { gte: subscription.expiresAt as Date } },
      });
      churnSurveyPending = !answered;
    }

    return {
      ...subscription,
      isActive: lapsed ? false : subscription.isActive,
      churnSurveyPending,
    };
  }

  async activatePromo(userId: string, code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const promo = await this.prisma.promoCode.findUnique({ where: { code: normalizedCode } });

    if (!promo) throw new NotFoundException('Промо-код не найден');

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Промо-код истёк');
    }

    const alreadyUsed = await this.prisma.promoUsage.findUnique({
      where: { promoId_userId: { promoId: promo.id, userId } },
    });

    if (alreadyUsed) {
      throw new ConflictException('Вы уже использовали этот промо-код');
    }

    await this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ usedCount: number; maxUses: number | null }[]>`
        SELECT "usedCount", "maxUses" FROM promo_codes WHERE id = ${promo.id} FOR UPDATE
      `;
      if (locked.maxUses !== null && locked.usedCount >= locked.maxUses) {
        throw new BadRequestException('Промо-код уже использован максимальное количество раз');
      }
      await tx.promoUsage.create({ data: { promoId: promo.id, userId } });
      await tx.promoCode.update({ where: { id: promo.id }, data: { usedCount: { increment: 1 } } });
      await tx.user.update({ where: { id: userId }, data: { freeChecksLeft: { increment: promo.checksToAdd } } });
    });

    return {
      message: `Промо-код активирован! Добавлено ${promo.checksToAdd} чеков.`,
      checksAdded: promo.checksToAdd,
    };
  }

  async addDaysToSubscription(userId: string, days: number) {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });

    const now = new Date();
    const base =
      existing?.isActive && existing.expiresAt && existing.expiresAt > now
        ? existing.expiresAt
        : now;
    const newExpiry = new Date(base);
    newExpiry.setDate(newExpiry.getDate() + days);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, isActive: true, expiresAt: newExpiry },
      update: { isActive: true, expiresAt: newExpiry },
    });
  }
}
