import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { StorageService } from './storage.service';
import { PresignRequestDto } from './dto/presign-request.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('storage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('storage')
export class StorageController {
	constructor(private storageService: StorageService) {}

	@Post('presign')
	@ApiOperation({ summary: 'Получить presigned URL для загрузки аудио в YOS' })
	async presign(@Body() dto: PresignRequestDto) {
		const result = await this.storageService.getPresignedPutUrl(dto.fileName, dto.contentType);
		return { success: true, data: result };
	}
}
