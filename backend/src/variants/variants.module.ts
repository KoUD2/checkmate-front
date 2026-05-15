import { Module } from '@nestjs/common';
import { VariantsAdminController, VariantsController } from './variants.controller';
import { VariantsService } from './variants.service';

@Module({
  controllers: [VariantsAdminController, VariantsController],
  providers: [VariantsService],
})
export class VariantsModule {}
