import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail = 'CheckMate <noreply@checkmateai.ru>';
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
    this.frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'https://app.checkmateai.ru';
  }

  async sendFirstCheckEmail(user: { email: string; firstName: string }) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: user.email,
        subject: 'Первая проверка готова — попробуй ещё раз',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <h2 style="font-size: 22px; margin-bottom: 16px;">Привет, ${user.firstName}!</h2>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              Ты только что сделал первую проверку в CheckMate — это большой шаг.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              У тебя ещё есть бесплатные проверки. Разбор по критериям работает лучше всего когда делаешь несколько попыток подряд — каждая следующая работа будет лучше предыдущей.
            </p>
            <a href="${this.frontendUrl}/create-work" style="display: inline-block; background: #e8643a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: bold; margin-bottom: 24px;">
              Проверить ещё одну работу
            </a>
            <p style="font-size: 14px; color: #888; margin-top: 32px;">
              CheckMate — AI-проверка заданий ЕГЭ по английскому
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send first check email', err);
    }
  }

  async sendChecksExhaustedEmail(user: { email: string; firstName: string }) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: user.email,
        subject: 'Бесплатные проверки закончились',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
            <h2 style="font-size: 22px; margin-bottom: 16px;">Привет, ${user.firstName}!</h2>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">
              Бесплатные проверки закончились. Но ты уже видел как работает разбор по критериям — продолжи практику.
            </p>
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 8px;">
              Самый доступный тариф:
            </p>
            <div style="background: #f5f5f5; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 18px; font-weight: bold;">Lite — 149 ₽</p>
              <p style="margin: 4px 0 0; font-size: 14px; color: #555;">10 проверок на 14 дней</p>
            </div>
            <a href="${this.frontendUrl}/subscribe" style="display: inline-block; background: #e8643a; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: bold; margin-bottom: 24px;">
              Выбрать тариф
            </a>
            <p style="font-size: 14px; color: #888; margin-top: 32px;">
              CheckMate — AI-проверка заданий ЕГЭ по английскому
            </p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send checks exhausted email', err);
    }
  }
}
