import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutoTradeScheduler } from './auto-trade.scheduler';
import { DataModule } from '../data/data.module';
import { RiskManagementModule } from '../risk-management/risk-management.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DataModule,
    RiskManagementModule,
  ],
  providers: [AutoTradeScheduler],
  exports: [AutoTradeScheduler],
})
export class SchedulerModule {}