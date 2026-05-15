import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role, TaskFormat, ExamSection } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ExamTasksService } from './exam-tasks.service';
import { CreateExamTaskDto } from './dto/create-exam-task.dto';
import { UpdateExamTaskDto } from './dto/update-exam-task.dto';

@ApiTags('exam-tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/exam-tasks')
export class ExamTasksController {
  constructor(private examTasksService: ExamTasksService) {}

  @Get()
  @ApiOperation({ summary: 'Список заданий банка (admin)' })
  @ApiQuery({ name: 'section', required: false, enum: ExamSection })
  @ApiQuery({ name: 'format', required: false, enum: TaskFormat })
  @ApiQuery({ name: 'source', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Query('section') section?: ExamSection,
    @Query('format') format?: TaskFormat,
    @Query('source') source?: string,
    @Query('page') rawPage = '1',
    @Query('limit') rawLimit = '20',
  ) {
    const page = Math.max(1, parseInt(rawPage, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));
    const result = await this.examTasksService.list({ section, format, source }, page, limit);
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить задание по id (admin)' })
  async getById(@Param('id') id: string) {
    const result = await this.examTasksService.getById(id);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Создать задание (admin)' })
  async create(@Body() dto: CreateExamTaskDto) {
    const result = await this.examTasksService.create(dto);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить задание (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateExamTaskDto) {
    const result = await this.examTasksService.update(id, dto);
    return { success: true, data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить задание (admin)' })
  @ApiQuery({ name: 'confirm', required: false, type: String })
  async remove(@Param('id') id: string, @Query('confirm') confirm?: string) {
    const result = await this.examTasksService.remove(id, confirm === 'true');
    return { success: true, data: result };
  }
}
