import { Module } from '@nestjs/common';
import { ExamTasksController } from './exam-tasks.controller';
import { ExamTasksService } from './exam-tasks.service';

@Module({
  controllers: [ExamTasksController],
  providers: [ExamTasksService],
})
export class ExamTasksModule {}
