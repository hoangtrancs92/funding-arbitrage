import { Module } from '@nestjs/common';
import { MexcConnector } from './mexc.connector';

@Module({
  providers: [MexcConnector],
  exports: [MexcConnector],
})
export class MexcModule {}