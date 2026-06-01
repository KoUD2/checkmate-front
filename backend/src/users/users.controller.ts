import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SetSegmentDto } from './dto/set-segment.dto';

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
}
