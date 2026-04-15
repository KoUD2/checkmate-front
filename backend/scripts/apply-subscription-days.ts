import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CHECKS_TO_DAYS: Record<number, number> = {
  10: 14,
  50: 30,
  200: 60,
  600: 90,
  2400: 365,
};

async function main() {
  const payments = await prisma.payment.findMany({
    where: { status: 'SUCCEEDED', daysToAdd: 0 },
    select: { id: true, userId: true, checksToAdd: true, createdAt: true },
  });

  console.log(`Найдено платежей с daysToAdd=0: ${payments.length}`);

  let updated = 0;

  for (const payment of payments) {
    const days = CHECKS_TO_DAYS[payment.checksToAdd];
    if (!days) {
      console.log(`  Пропуск: checksToAdd=${payment.checksToAdd} — неизвестный пакет`);
      continue;
    }

    // Вычисляем дату истечения от даты покупки
    const expiresAt = new Date(payment.createdAt);
    expiresAt.setDate(expiresAt.getDate() + days);

    // Обновляем или создаём подписку
    const existing = await prisma.subscription.findUnique({ where: { userId: payment.userId } });

    if (existing?.isActive && existing.expiresAt && existing.expiresAt > expiresAt) {
      // Подписка уже активна и дольше — не трогаем
    } else {
      await prisma.subscription.upsert({
        where: { userId: payment.userId },
        create: { userId: payment.userId, isActive: expiresAt > new Date(), expiresAt },
        update: { isActive: expiresAt > new Date(), expiresAt },
      });
    }

    // Обновляем запись платежа
    await prisma.payment.update({
      where: { id: payment.id },
      data: { daysToAdd: days },
    });

    console.log(`  ✓ userId=${payment.userId} | ${payment.checksToAdd} проверок → +${days} дней | до ${expiresAt.toLocaleDateString('ru-RU')}`);
    updated++;
  }

  console.log(`\nГотово: обновлено ${updated} из ${payments.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
