import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('analytics')
  @ApiOperation({ summary: 'Дерево метрик (PAC и декомпозиция)' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getMetrics(@Query('from') from?: string, @Query('to') to?: string) {
    const result = await this.analyticsService.getMetrics(from, to);
    return { success: true, data: result };
  }
}
