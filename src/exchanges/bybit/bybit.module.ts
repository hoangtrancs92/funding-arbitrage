import { Module } from '@nestjs/common';
import { BybitConnector } from './bybit.connector';

@Module({
  providers: [BybitConnector],
  exports: [BybitConnector],
})
export class BybitModule {}
