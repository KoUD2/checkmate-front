import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const SOCIAL_BONUS_CHECKS = 2;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organization: dto.organization,
      },
    });

    const tokens = await this.generateTokens(user);

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    return user;
  }

  async login(user: any) {
    const tokens = await this.generateTokens(user);
    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshTokens(refreshToken: string) {
    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Невалидный refresh token');
    }

    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId: payload.sub, isRevoked: false },
    });

    let validToken: any = null;
    for (const t of tokens) {
      const match = await bcrypt.compare(refreshToken, t.tokenHash);
      if (match) {
        validToken = t;
        break;
      }
    }

    if (!validToken || new Date() > validToken.expiresAt) {
      throw new UnauthorizedException('Refresh token истёк или не найден');
    }

    await this.prisma.refreshToken.update({
      where: { id: validToken.id },
      data: { isRevoked: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const newTokens = await this.generateTokens(user);
    return newTokens;
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) throw new UnauthorizedException('Пользователь не найден');
    return this.sanitizeUser(user);
  }

  // ─── VK OAuth ─────────────────────────────────────────────────────────────

  async initVkOAuth(userId: string): Promise<{ url: string }> {
    const state = await this.createOAuthState(userId, 'vk');
    const appId = this.configService.get<string>('VK_APP_ID');
    const redirectUri = this.configService.get<string>('VK_REDIRECT_URI');
    const url =
      `https://oauth.vk.com/authorize` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=email` +
      `&state=${state}` +
      `&v=5.199`;
    return { url };
  }

  async handleVkCallback(code: string, state: string): Promise<string> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const userId = await this.consumeOAuthState(state, 'vk');
    if (!userId) return `${frontendUrl}/subscribe?social=error&reason=state`;

    const appId = this.configService.get<string>('VK_APP_ID');
    const appSecret = this.configService.get<string>('VK_APP_SECRET');
    const redirectUri = this.configService.get<string>('VK_REDIRECT_URI');

    let vkUserId: string;
    try {
      const tokenRes = await axios.get('https://oauth.vk.com/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });
      vkUserId = String(tokenRes.data.user_id);
    } catch {
      return `${frontendUrl}/subscribe?social=error&reason=vk`;
    }

    // Check if this VK ID is already linked to another account
    const existing = await this.prisma.user.findUnique({ where: { vkId: vkUserId } });
    if (existing && existing.id !== userId) {
      return `${frontendUrl}/subscribe?social=error&reason=already_used`;
    }

    await this.linkSocialAndGrantBonus(userId, { vkId: vkUserId });
    return `${frontendUrl}/subscribe?social=success`;
  }

  // ─── Yandex OAuth ─────────────────────────────────────────────────────────

  async initYandexOAuth(userId: string): Promise<{ url: string }> {
    const state = await this.createOAuthState(userId, 'yandex');
    const clientId = this.configService.get<string>('YANDEX_CLIENT_ID');
    const redirectUri = this.configService.get<string>('YANDEX_REDIRECT_URI');
    const url =
      `https://oauth.yandex.ru/authorize` +
      `?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&state=${state}`;
    return { url };
  }

  async handleYandexCallback(code: string, state: string): Promise<string> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const userId = await this.consumeOAuthState(state, 'yandex');
    if (!userId) return `${frontendUrl}/subscribe?social=error&reason=state`;

    const clientId = this.configService.get<string>('YANDEX_CLIENT_ID');
    const clientSecret = this.configService.get<string>('YANDEX_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('YANDEX_REDIRECT_URI');

    let yandexUserId: string;
    try {
      const tokenRes = await axios.post(
        'https://oauth.yandex.ru/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      const accessToken = tokenRes.data.access_token;
      const infoRes = await axios.get('https://login.yandex.ru/info', {
        headers: { Authorization: `OAuth ${accessToken}` },
      });
      yandexUserId = String(infoRes.data.id);
    } catch {
      return `${frontendUrl}/subscribe?social=error&reason=yandex`;
    }

    const existing = await this.prisma.user.findUnique({ where: { yandexId: yandexUserId } });
    if (existing && existing.id !== userId) {
      return `${frontendUrl}/subscribe?social=error&reason=already_used`;
    }

    await this.linkSocialAndGrantBonus(userId, { yandexId: yandexUserId });
    return `${frontendUrl}/subscribe?social=success`;
  }

  // ─── Telegram ─────────────────────────────────────────────────────────────

  async connectTelegram(userId: string, dto: TelegramAuthDto): Promise<{ alreadyGranted: boolean }> {
    // Verify Telegram auth hash
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const secretKey = crypto.createHash('sha256').update(botToken).digest();

    const { hash, ...data } = dto;
    const checkString = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const expectedHash = crypto
      .createHmac('sha256', secretKey)
      .update(checkString)
      .digest('hex');

    if (expectedHash !== hash) {
      throw new BadRequestException('Неверная подпись Telegram');
    }

    // Check auth_date freshness (max 5 minutes)
    const authDate = dto.auth_date * 1000;
    if (Date.now() - authDate > 5 * 60 * 1000) {
      throw new BadRequestException('Данные авторизации Telegram устарели');
    }

    const telegramId = String(dto.id);

    const existing = await this.prisma.user.findUnique({ where: { telegramId } });
    if (existing && existing.id !== userId) {
      throw new BadRequestException('Этот аккаунт Telegram уже привязан к другому пользователю');
    }

    const user = await this.linkSocialAndGrantBonus(userId, { telegramId });
    return { alreadyGranted: user.socialBonusGranted };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async createOAuthState(userId: string, provider: string): Promise<string> {
    // Clean up expired states
    await this.prisma.oAuthState.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const state = await this.prisma.oAuthState.create({
      data: { id: uuidv4(), userId, provider, expiresAt },
    });
    return state.id;
  }

  private async consumeOAuthState(stateId: string, provider: string): Promise<string | null> {
    const state = await this.prisma.oAuthState.findUnique({ where: { id: stateId } });
    if (!state || state.provider !== provider || new Date() > state.expiresAt) return null;
    await this.prisma.oAuthState.delete({ where: { id: stateId } });
    return state.userId;
  }

  private async linkSocialAndGrantBonus(
    userId: string,
    socialData: { vkId?: string; telegramId?: string; yandexId?: string },
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Пользователь не найден');

    const grantBonus = !user.socialBonusGranted;

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...socialData,
        ...(grantBonus && {
          freeChecksLeft: { increment: SOCIAL_BONUS_CHECKS },
          socialBonusGranted: true,
        }),
      },
    });
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '30m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '30d',
    });

    const tokenHash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.refreshToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }
}
