import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AutoTradeScheduler } from './auto-trade.scheduler';
import { OpportunityOptimizer } from './opportunity-optimizer.service';
import { DataModule } from '../data/data.module';
import { RiskManagementModule } from '../risk-management/risk-management.module';
import { WebSocketModule } from '../websocket/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    DataModule,
    RiskManagementModule,
    forwardRef(() => WebSocketModule),
  ],
  providers: [AutoTradeScheduler, OpportunityOptimizer],
  exports: [AutoTradeScheduler, OpportunityOptimizer],
})
export class SchedulerModule {}