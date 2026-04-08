import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Регистрация' })
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.signup(dto);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { success: true, data: { user, accessToken } };
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Вход' })
  async login(
    @Body() _dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, accessToken, refreshToken } = await this.authService.login(req.user);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { success: true, data: { user, accessToken } };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Обновить access token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      return { success: false, message: 'Refresh token не найден' };
    }
    const { accessToken, refreshToken } = await this.authService.refreshTokens(token);
    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS);
    return { success: true, data: { accessToken } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Профиль текущего пользователя' })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.authService.getMe(userId);
    return { success: true, data: { user } };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Выход' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    res.clearCookie(REFRESH_COOKIE);
    return { success: true, message: 'Вы успешно вышли' };
  }

  // ─── VK OAuth ─────────────────────────────────────────────────────────────

  @Get('vk/init')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Инициация OAuth через ВКонтакте' })
  async vkInit(@CurrentUser('id') userId: string) {
    return this.authService.initVkOAuth(userId);
  }

  @Get('vk/callback')
  @ApiOperation({ summary: 'Callback OAuth ВКонтакте' })
  async vkCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.authService.handleVkCallback(code, state);
    return res.redirect(redirectUrl);
  }

  // ─── Yandex OAuth ─────────────────────────────────────────────────────────

  @Get('yandex/init')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Инициация OAuth через Яндекс' })
  async yandexInit(@CurrentUser('id') userId: string) {
    return this.authService.initYandexOAuth(userId);
  }

  @Get('yandex/callback')
  @ApiOperation({ summary: 'Callback OAuth Яндекс' })
  async yandexCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await this.authService.handleYandexCallback(code, state);
    return res.redirect(redirectUrl);
  }

  // ─── Telegram ─────────────────────────────────────────────────────────────

  @Post('telegram/connect')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Привязка Telegram аккаунта' })
  async telegramConnect(
    @CurrentUser('id') userId: string,
    @Body() dto: TelegramAuthDto,
  ) {
    const result = await this.authService.connectTelegram(userId, dto);
    return { success: true, data: result };
  }
}
