import { Module } from '@nestjs/common';
import { BinanceModule } from './binance/binance.module';
import { BybitModule } from './bybit/bybit.module';
import { OkxModule } from './okx/okx.module';

@Module({
  imports: [BinanceModule, BybitModule, OkxModule],
  exports: [BinanceModule, BybitModule, OkxModule],
})
export class ExchangesModule {}