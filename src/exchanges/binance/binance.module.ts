import { Module } from '@nestjs/common';
import { BinanceConnector } from './binance.connector';

@Module({
  providers: [BinanceConnector],
  exports: [BinanceConnector],
})
export class BinanceModule {}