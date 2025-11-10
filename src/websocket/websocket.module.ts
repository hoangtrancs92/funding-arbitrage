import { Module, forwardRef } from '@nestjs/common';
import { TradingGateway } from './trading.gateway';
import { DataModule } from '../data/data.module';
import { ArbitrageModule } from '../arbitrage/arbitrage.module';

@Module({
  imports: [DataModule, ArbitrageModule],
  providers: [TradingGateway],
  exports: [TradingGateway],
})
export class WebSocketModule {}
