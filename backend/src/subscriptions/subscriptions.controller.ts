import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { ActivatePromoDto } from './dto/activate-promo.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Текущая подписка' })
  async getMySubscription(@CurrentUser('id') userId: string) {
    const subscription = await this.subscriptionsService.getMySubscription(userId);
    return { success: true, data: { subscription } };
  }

  @Post('promo')
  @ApiOperation({ summary: 'Активировать промо-код' })
  async activatePromo(
    @CurrentUser('id') userId: string,
    @Body() dto: ActivatePromoDto,
  ) {
    const result = await this.subscriptionsService.activatePromo(userId, dto.code);
    return { success: true, data: result };
  }
}
