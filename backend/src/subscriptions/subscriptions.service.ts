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
      return { isActive: false, expiresAt: null };
    }

    const isExpired =
      subscription.expiresAt && subscription.expiresAt < new Date();

    if (isExpired && subscription.isActive) {
      await this.prisma.subscription.update({
        where: { userId },
        data: { isActive: false },
      });
      return { isActive: false, expiresAt: subscription.expiresAt };
    }

    return subscription;
  }

  async activatePromo(userId: string, code: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });

    if (!promo) throw new NotFoundException('Промо-код не найден');

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Промо-код истёк');
    }

    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Промо-код уже использован максимальное количество раз');
    }

    const alreadyUsed = await this.prisma.promoUsage.findUnique({
      where: { promoId_userId: { promoId: promo.id, userId } },
    });

    if (alreadyUsed) {
      throw new ConflictException('Вы уже использовали этот промо-код');
    }

    await this.prisma.$transaction([
      this.prisma.promoUsage.create({
        data: { promoId: promo.id, userId },
      }),
      this.prisma.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    await this.addDaysToSubscription(userId, promo.days);

    return {
      message: `Промо-код активирован! Добавлено ${promo.days} дней.`,
      daysAdded: promo.days,
    };
  }

  async addDaysToSubscription(userId: string, days: number) {
    const existing = await this.prisma.subscription.findUnique({ where: { userId } });

    const now = new Date();
    const newExpiry = new Date(now);
    newExpiry.setDate(newExpiry.getDate() + days);

    await this.prisma.subscription.upsert({
      where: { userId },
      create: { userId, isActive: true, expiresAt: newExpiry },
      update: { isActive: true, expiresAt: newExpiry },
    });
  }
}
