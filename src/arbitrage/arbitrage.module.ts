import { Module } from '@nestjs/common';
import { ArbitrageDetector } from './arbitrage-detector.service';

@Module({
  providers: [ArbitrageDetector],
  exports: [ArbitrageDetector],
})
export class ArbitrageModule {}
