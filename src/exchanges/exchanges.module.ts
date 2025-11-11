import { Module } from '@nestjs/common';
import { BinanceModule } from './binance/binance.module';
import { BybitModule } from './bybit/bybit.module';
import { MexcModule } from './mexc/mexc.module';

@Module({
  imports: [BinanceModule, BybitModule, MexcModule],
  exports: [BinanceModule, BybitModule, MexcModule],
})
export class ExchangesModule {}