import { Module } from '@nestjs/common';
import { BinanceModule } from './binance/binance.module';
import { BybitModule } from './bybit/bybit.module';
import { ExchangeInfoController } from './exchanges.controller';

@Module({
  imports: [BinanceModule, BybitModule],
  exports: [BinanceModule, BybitModule],
  controllers: [ExchangeInfoController],
})
export class ExchangesModule {}