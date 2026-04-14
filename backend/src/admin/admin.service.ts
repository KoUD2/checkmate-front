import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async listUsers(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          freeChecksLeft: true,
          createdAt: true,
          subscription: { select: { isActive: true, expiresAt: true } },
          _count: { select: { tasks: true } },
        },
      }),
      this.prisma.user.count(),
    ]);

    return { users, total, page, totalPages: Math.ceil(total / limit) };
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        freeChecksLeft: true,
      },
    });

    return updated;
  }

  async createPromo(dto: CreatePromoDto) {
    const promo = await this.prisma.promoCode.create({
      data: {
        code: dto.code.toUpperCase(),
        days: dto.days,
        description: dto.description,
        maxUses: dto.maxUses,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
    return promo;
  }

  async listPromos(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [promos, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { usages: true } } },
      }),
      this.prisma.promoCode.count(),
    ]);

    return { promos, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getStats() {
    const [totalUsers, totalTasks, totalPayments, revenueAgg] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.task.count(),
      this.prisma.payment.count({ where: { status: 'SUCCEEDED' } }),
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'SUCCEEDED' },
      }),
    ]);

    return {
      totalUsers,
      totalTasks,
      totalPayments,
      totalRevenue: Number(revenueAgg._sum.amount ?? 0),
    };
  }

  async listTasks(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          totalScore: true,
          createdAt: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.task.count(),
    ]);

    return { tasks, total, page, totalPages: Math.ceil(total / limit) };
  }
}
