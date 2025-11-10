import { Module } from '@nestjs/common';
import { FundingRateController } from './funding-rate.controller';
import { AutoTradeController } from './auto-trade.controller';
import { DataModule } from '../data/data.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
  imports: [DataModule, SchedulerModule],
  controllers: [FundingRateController, AutoTradeController],
})
export class ApiModule {}
