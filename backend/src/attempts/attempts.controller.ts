import {
	Controller,
	Get,
	Post,
	Patch,
	Put,
	Body,
	Param,
	UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../common/decorators/current-user.decorator'
import { AttemptsService } from './attempts.service'
import { UpsertAnswerDto } from './dto/upsert-answer.dto'
import { SkipSectionDto } from './dto/skip-section.dto'

@ApiTags('attempts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attempts')
export class AttemptsController {
	constructor(private attemptsService: AttemptsService) {}

	@Get('by-variant/:variantId')
	@ApiOperation({ summary: 'Получить или создать попытку' })
	async getOrCreate(
		@Param('variantId') variantId: string,
		@CurrentUser('id') userId: string,
	) {
		const result = await this.attemptsService.getOrCreateAttempt(userId, variantId)
		return { success: true, data: result }
	}

	@Put(':id/answers/:taskId')
	@ApiOperation({ summary: 'Сохранить ответ (upsert)' })
	async upsertAnswer(
		@Param('id') attemptId: string,
		@Param('taskId') taskId: string,
		@Body() dto: UpsertAnswerDto,
		@CurrentUser('id') userId: string,
	) {
		const result = await this.attemptsService.upsertAnswer(attemptId, taskId, userId, dto.content)
		return { success: true, data: result }
	}

	@Post(':id/answers/:taskId/increment-play')
	@ApiOperation({ summary: 'Увеличить счётчик воспроизведений' })
	async incrementPlay(
		@Param('id') attemptId: string,
		@Param('taskId') taskId: string,
		@CurrentUser('id') userId: string,
	) {
		const result = await this.attemptsService.incrementPlay(attemptId, taskId, userId)
		return { success: true, data: result }
	}

	@Patch(':id/skip-section')
	@ApiOperation({ summary: 'Пропустить/вернуть раздел' })
	async skipSection(
		@Param('id') attemptId: string,
		@Body() dto: SkipSectionDto,
		@CurrentUser('id') userId: string,
	) {
		const result = await this.attemptsService.skipSection(attemptId, userId, dto.section, dto.skip)
		return { success: true, data: result }
	}

	@Post(':id/submit')
	@ApiOperation({ summary: 'Отправить попытку на проверку' })
	async submit(
		@Param('id') attemptId: string,
		@CurrentUser('id') userId: string,
	) {
		const result = await this.attemptsService.submit(attemptId, userId)
		return { success: true, data: result }
	}
}
