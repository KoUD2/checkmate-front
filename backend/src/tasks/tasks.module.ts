import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { GeminiModule } from '../gemini/gemini.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [GeminiModule, EmailModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
