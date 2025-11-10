import { Module } from '@nestjs/common';
import { FundingRateService } from './funding-rate.service';
import { ExchangesModule } from '../exchanges/exchanges.module';
import { ArbitrageModule } from '../arbitrage/arbitrage.module';
import { StrategiesModule } from '../strategies/strategies.module';
import { RiskManagementModule } from '../risk-management/risk-management.module';

@Module({
  imports: [
    ExchangesModule,
    ArbitrageModule,
    StrategiesModule,
    RiskManagementModule,
  ],
  providers: [FundingRateService],
  exports: [FundingRateService],
})
export class DataModule {}
