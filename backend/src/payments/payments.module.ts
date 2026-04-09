import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ReferralsModule } from '../referrals/referrals.module';

@Module({
  imports: [SubscriptionsModule, ReferralsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
