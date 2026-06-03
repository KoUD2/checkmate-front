import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SetSegmentDto } from './dto/set-segment.dto';
import { CancelFeedbackDto } from './dto/cancel-feedback.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Профиль с подпиской и остатком бесплатных проверок' })
  async getMe(@CurrentUser('id') userId: string) {
    const user = await this.usersService.getMe(userId);
    return { success: true, data: { user } };
  }

  @Patch('me/segment')
  @ApiOperation({ summary: 'Установить сегмент пользователя (репетитор/ученик/родитель)' })
  async setSegment(
    @CurrentUser('id') userId: string,
    @Body() dto: SetSegmentDto,
  ) {
    const result = await this.usersService.setSegment(userId, dto.segment);
    return { success: true, data: result };
  }

  @Post('me/cancel-feedback')
  @ApiOperation({ summary: 'Причина отмены подписки (exit-survey)' })
  async cancelFeedback(
    @CurrentUser('id') userId: string,
    @Body() dto: CancelFeedbackDto,
  ) {
    const result = await this.usersService.createCancelFeedback(
      userId, dto.reason, dto.comment,
    );
    return { success: true, data: result };
  }
}
