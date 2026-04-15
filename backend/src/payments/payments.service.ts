import { Injectable, InternalServerErrorException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { ReferralsService } from '../referrals/referrals.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const YOOKASSA_API = 'https://api.yookassa.ru/v3';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private shopId: string;
  private secretKey: string;

  constructor(
    private prisma: PrismaService,
    private subscriptionsService: SubscriptionsService,
    private referralsService: ReferralsService,
    private configService: ConfigService,
  ) {
    this.shopId = this.configService.get<string>('YOOKASSA_SHOP_ID') || '';
    this.secretKey = this.configService.get<string>('YOOKASSA_SECRET_KEY') || '';
  }

  async createPayment(userId: string, dto: CreatePaymentDto) {
    if (!this.shopId || !this.secretKey) {
      throw new InternalServerErrorException('YooKassa не настроена (YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY)');
    }

    const baseReturnUrl =
      this.configService.get<string>('YOOKASSA_RETURN_URL') ||
      'http://localhost:3000/payment/success';

    const userEmail = await this.getUserEmail(userId);
    const idempotenceKey = uuidv4();
    const days = dto.daysToAdd ?? 0;
    const description = `Пакет проверок CheckMate: ${dto.checksToAdd} проверок`;

    // paymentId будет добавлен после создания платежа в YooKassa
    const payload = {
      amount: { value: dto.amount.toFixed(2), currency: 'RUB' },
      confirmation: { type: 'redirect', return_url: baseReturnUrl },
      description,
      metadata: { userId, daysToAdd: String(days), checksToAdd: String(dto.checksToAdd) },
      capture: true,
      receipt: {
        customer: { email: userEmail },
        items: [
          {
            description,
            quantity: '1.000',
            amount: { value: dto.amount.toFixed(2), currency: 'RUB' },
            vat_code: 1,
            payment_subject: 'service',
            payment_mode: 'full_payment',
          },
        ],
      },
    };

    let response: any;
    try {
      response = await axios.post(`${YOOKASSA_API}/payments`, payload, {
        auth: { username: this.shopId, password: this.secretKey },
        headers: {
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.error('[Payment] YooKassa error:', JSON.stringify(err?.response?.data || err?.message));
      const msg = err?.response?.data?.description || err?.message || 'Ошибка YooKassa';
      throw new InternalServerErrorException(msg);
    }

    const payment = response.data;

    await this.prisma.payment.create({
      data: {
        userId,
        yookassaId: payment.id,
        status: PaymentStatus.PENDING,
        amount: dto.amount,
        daysToAdd: days,
        checksToAdd: dto.checksToAdd,
      },
    });

    // Добавляем paymentId в return_url чтобы фронтенд мог вызвать verify
    const confirmationUrl: string = payment.confirmation.confirmation_url;
    const returnUrlWithId = `${baseReturnUrl}?paymentId=${payment.id}`;
    const finalConfirmationUrl = confirmationUrl.replace(
      encodeURIComponent(baseReturnUrl),
      encodeURIComponent(returnUrlWithId),
    );

    return {
      paymentId: payment.id,
      confirmationUrl: finalConfirmationUrl || confirmationUrl,
    };
  }

  async verifyPayment(yookassaId: string, userId: string) {
    const payment = await this.prisma.payment.findUnique({ where: { yookassaId } });

    if (!payment) {
      throw new NotFoundException('Платёж не найден');
    }

    if (payment.userId !== userId) {
      throw new BadRequestException('Нет доступа к этому платежу');
    }

    // Если уже обработан — просто возвращаем статус
    if (payment.status === PaymentStatus.SUCCEEDED) {
      return { status: 'succeeded', alreadyProcessed: true };
    }

    // Запрашиваем актуальный статус у YooKassa
    let ykPayment: any;
    try {
      const response = await axios.get(`${YOOKASSA_API}/payments/${yookassaId}`, {
        auth: { username: this.shopId, password: this.secretKey },
      });
      ykPayment = response.data;
    } catch (err) {
      throw new InternalServerErrorException('Не удалось получить статус платежа от YooKassa');
    }

    if (ykPayment.status === 'succeeded') {
      await this.prisma.payment.update({
        where: { yookassaId },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      if (payment.daysToAdd > 0) {
        await this.subscriptionsService.addDaysToSubscription(payment.userId, payment.daysToAdd);
      }
      await this.prisma.user.update({
        where: { id: payment.userId },
        data: { freeChecksLeft: { increment: payment.checksToAdd } },
      });
      this.referralsService.processReferralBonus(payment.userId).catch((err) =>
        this.logger.error(`Referral bonus error for user ${payment.userId}: ${err?.message}`),
      );
      return { status: 'succeeded', alreadyProcessed: false };
    }

    if (ykPayment.status === 'canceled') {
      await this.prisma.payment.update({
        where: { yookassaId },
        data: { status: PaymentStatus.CANCELED },
      });
      return { status: 'canceled', alreadyProcessed: false };
    }

    return { status: ykPayment.status, alreadyProcessed: false };
  }

  async handleWebhook(body: any) {
    if (!body?.object?.id || !body?.event) return;

    const yookassaId: string = body.object.id;
    const event: string = body.event;

    const payment = await this.prisma.payment.findUnique({ where: { yookassaId } });
    if (!payment) return;

    if (event === 'payment.succeeded') {
      await this.prisma.payment.update({
        where: { yookassaId },
        data: { status: PaymentStatus.SUCCEEDED },
      });
      if (payment.daysToAdd > 0) {
        await this.subscriptionsService.addDaysToSubscription(payment.userId, payment.daysToAdd);
      }
      await this.prisma.user.update({
        where: { id: payment.userId },
        data: { freeChecksLeft: { increment: payment.checksToAdd } },
      });
      this.referralsService.processReferralBonus(payment.userId).catch((err) =>
        this.logger.error(`Referral bonus error for user ${payment.userId}: ${err?.message}`),
      );
    }

    if (event === 'payment.canceled') {
      await this.prisma.payment.update({
        where: { yookassaId },
        data: { status: PaymentStatus.CANCELED },
      });
    }
  }

  async getMyPayments(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where: { userId } }),
    ]);
    return { payments, total, totalPages: Math.ceil(total / limit) };
  }

  private async getUserEmail(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.email ?? 'unknown@example.com';
  }
}
