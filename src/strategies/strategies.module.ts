import { Module } from '@nestjs/common';
import { FundingArbitrageStrategyService } from './funding-arbitrage-strategy.service';

@Module({
  providers: [FundingArbitrageStrategyService],
  exports: [FundingArbitrageStrategyService],
})
export class StrategiesModule {}