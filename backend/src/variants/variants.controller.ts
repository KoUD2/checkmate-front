import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { VariantsService } from './variants.service';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { AssignTasksDto } from './dto/assign-tasks.dto';

@ApiTags('variants-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/variants')
export class VariantsAdminController {
  constructor(private variantsService: VariantsService) {}

  @Get()
  @ApiOperation({ summary: 'Список вариантов (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Query('page') rawPage = '1',
    @Query('limit') rawLimit = '20',
  ) {
    const page = Math.max(1, parseInt(rawPage, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));
    const result = await this.variantsService.adminList(page, limit);
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить вариант по id (admin)' })
  async getById(@Param('id') id: string) {
    const result = await this.variantsService.getById(id);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Создать вариант (admin)' })
  async create(@Body() dto: CreateVariantDto) {
    const result = await this.variantsService.create(dto);
    return { success: true, data: result };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить вариант (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    const result = await this.variantsService.update(id, dto);
    return { success: true, data: result };
  }

  @Put(':id/tasks')
  @ApiOperation({ summary: 'Назначить задания варианту (bulk replace)' })
  async assignTasks(@Param('id') id: string, @Body() dto: AssignTasksDto) {
    const result = await this.variantsService.assignTasks(id, dto.taskIds);
    return { success: true, data: result };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить вариант (admin)' })
  async remove(@Param('id') id: string) {
    const result = await this.variantsService.remove(id);
    return { success: true, data: result };
  }
}

@ApiTags('variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('variants')
export class VariantsController {
  constructor(private variantsService: VariantsService) {}

  @Get()
  @ApiOperation({ summary: 'Список опубликованных вариантов' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Query('page') rawPage = '1',
    @Query('limit') rawLimit = '20',
  ) {
    const page = Math.max(1, parseInt(rawPage, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(rawLimit, 10) || 20));
    const result = await this.variantsService.listPublished(page, limit);
    return { success: true, data: result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить вариант по id' })
  async getById(@Param('id') id: string) {
    const result = await this.variantsService.getPublishedById(id);
    return { success: true, data: result };
  }
}
