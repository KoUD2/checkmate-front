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
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { ResourceType, Role } from '@prisma/client'
import { ResourcesService } from './resources.service'
import { CreateResourceDto } from './dto/create-resource.dto'
import { UpdateResourceDto } from './dto/update-resource.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../common/guards/roles.guard'
import { Roles } from '../common/decorators/roles.decorator'

@ApiTags('resources')
@Controller('resources')
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  @ApiOperation({ summary: 'Список опубликованных ресурсов' })
  @ApiQuery({ name: 'type', required: false, enum: ResourceType })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async list(
    @Query('type') type?: ResourceType,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    const result = await this.resourcesService.listPublic(type, +page, +limit)
    return { success: true, data: result }
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Ресурс по slug' })
  async getBySlug(@Param('slug') slug: string) {
    const resource = await this.resourcesService.findBySlug(slug)
    return { success: true, data: resource }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin/list')
  @ApiOperation({ summary: 'Все ресурсы (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async adminList(@Query('page') page = 1, @Query('limit') limit = 20) {
    const result = await this.resourcesService.adminList(+page, +limit)
    return { success: true, data: result }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin')
  @ApiOperation({ summary: 'Создать ресурс (admin)' })
  async create(@Body() dto: CreateResourceDto) {
    const resource = await this.resourcesService.create(dto)
    return { success: true, data: resource }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('admin/:id')
  @ApiOperation({ summary: 'Обновить ресурс (admin)' })
  async update(@Param('id') id: string, @Body() dto: UpdateResourceDto) {
    const resource = await this.resourcesService.update(id, dto)
    return { success: true, data: resource }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  @ApiOperation({ summary: 'Удалить ресурс (admin)' })
  async remove(@Param('id') id: string) {
    await this.resourcesService.remove(id)
    return { success: true }
  }
}
