import { Module } from '@nestjs/common';
import { BinanceModule } from './binance/binance.module';
import { BybitModule } from './bybit/bybit.module';

@Module({
  imports: [BinanceModule, BybitModule],
  exports: [BinanceModule, BybitModule],
})
export class ExchangesModule {}