import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReferralsService } from './referrals.service';

@ApiTags('referrals')
@Controller('referrals')
export class ReferralsController {
  constructor(private referralsService: ReferralsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить реферальную статистику' })
  async getMyStats(@CurrentUser() user: { id: string }) {
    const stats = await this.referralsService.getMyStats(user.id);
    return { success: true, data: stats };
  }
}
