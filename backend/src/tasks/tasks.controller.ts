import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTask37Dto } from './dto/create-task37.dto';
import { CreateTask38Dto } from './dto/create-task38.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post('37')
  @ApiOperation({ summary: 'Отправить задание 37 (письмо/эссе)' })
  async submitTask37(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTask37Dto,
  ) {
    const task = await this.tasksService.submitTask37(userId, dto);
    return { success: true, data: { task } };
  }

  @Post('38')
  @ApiOperation({ summary: 'Отправить задание 38 (график/таблица)' })
  async submitTask38(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateTask38Dto,
  ) {
    const task = await this.tasksService.submitTask38(userId, dto);
    return { success: true, data: { task } };
  }

  @Get()
  @ApiOperation({ summary: 'История проверок' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    const result = await this.tasksService.getHistory(userId, +page, +limit);
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Детали проверки' })
  async getTask(
    @CurrentUser('id') userId: string,
    @Param('id') taskId: string,
  ) {
    const task = await this.tasksService.getTask(userId, taskId);
    return { success: true, data: { task } };
  }
}
