import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Список всех пользователей' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listUsers(@Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.adminService.listUsers(+page, +limit);
    return { success: true, data: result };
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Обновить пользователя (роль, статус, баланс проверок)' })
  async updateUser(@Param('id') userId: string, @Body() dto: UpdateUserDto) {
    const user = await this.adminService.updateUser(userId, dto);
    return { success: true, data: { user } };
  }

  @Post('promo')
  @ApiOperation({ summary: 'Создать промо-код' })
  async createPromo(@Body() dto: CreatePromoDto) {
    const promo = await this.adminService.createPromo(dto);
    return { success: true, data: { promo } };
  }

  @Get('promo')
  @ApiOperation({ summary: 'Список промо-кодов со статистикой' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPromos(@Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.adminService.listPromos(+page, +limit);
    return { success: true, data: result };
  }

  @Get('payments')
  @ApiOperation({ summary: 'Все платежи' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listPayments(@Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.adminService.listPayments(+page, +limit);
    return { success: true, data: result };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Общая статистика' })
  async getStats() {
    const stats = await this.adminService.getStats();
    return { success: true, data: stats };
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Все задания пользователей' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listTasks(@Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.adminService.listTasks(+page, +limit);
    return { success: true, data: result };
  }
}
