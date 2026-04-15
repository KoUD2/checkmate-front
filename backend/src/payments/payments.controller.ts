import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Создать платёж (получить ссылку YooKassa)' })
  async createPayment(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    const result = await this.paymentsService.createPayment(userId, dto);
    return { success: true, data: result };
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Проверить статус платежа и начислить проверки если оплачено' })
  @ApiQuery({ name: 'paymentId', description: 'ID платежа в YooKassa' })
  async verifyPayment(
    @Query('paymentId') paymentId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.paymentsService.verifyPayment(paymentId, userId);
    return { success: true, data: result };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'История платежей текущего пользователя' })
  async getMyPayments(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.paymentsService.getMyPayments(userId, page, limit);
    return { success: true, data: result };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Webhook от YooKassa (публичный)' })
  async webhook(@Body() body: any) {
    await this.paymentsService.handleWebhook(body);
    return { success: true };
  }
}
