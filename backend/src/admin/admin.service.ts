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

  async listPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          yookassaId: true,
          status: true,
          amount: true,
          checksToAdd: true,
          createdAt: true,
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.payment.count(),
    ]);

    return { payments, total, page, totalPages: Math.ceil(total / limit) };
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

  async getCharts() {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [payments, users, tasks] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: 'SUCCEEDED', createdAt: { gte: since } },
        select: { amount: true, checksToAdd: true, createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.task.findMany({
        where: { createdAt: { gte: since } },
        select: { type: true, createdAt: true },
      }),
    ]);

    const toDay = (d: Date) => d.toISOString().slice(0, 10);

    // Выручка по дням
    const revenueMap: Record<string, number> = {};
    for (const p of payments) {
      const day = toDay(p.createdAt);
      revenueMap[day] = (revenueMap[day] ?? 0) + Number(p.amount);
    }

    // Регистрации по дням
    const usersMap: Record<string, number> = {};
    for (const u of users) {
      const day = toDay(u.createdAt);
      usersMap[day] = (usersMap[day] ?? 0) + 1;
    }

    // Заполняем все 30 дней (в т.ч. нули)
    const days: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toDay(d));
    }

    const revenueByDay = days.map(day => ({ day, value: revenueMap[day] ?? 0 }));
    const usersByDay = days.map(day => ({ day, value: usersMap[day] ?? 0 }));

    // Задания по типу
    const taskTypeMap: Record<string, number> = {};
    for (const t of tasks) {
      taskTypeMap[t.type] = (taskTypeMap[t.type] ?? 0) + 1;
    }
    const tasksByType = Object.entries(taskTypeMap).map(([type, count]) => ({ type, count }));

    // Продажи по пакетам
    const packageMap: Record<number, number> = {};
    for (const p of payments) {
      packageMap[p.checksToAdd] = (packageMap[p.checksToAdd] ?? 0) + 1;
    }
    const PACKAGE_NAMES: Record<number, string> = { 10: 'Lite', 50: 'Plus', 200: 'Pro', 600: 'Ultra', 2400: 'Mega' };
    const salesByPackage = Object.entries(packageMap).map(([checks, count]) => ({
      name: PACKAGE_NAMES[Number(checks)] ?? `${checks} проверок`,
      count,
    }));

    return { revenueByDay, usersByDay, tasksByType, salesByPackage };
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
