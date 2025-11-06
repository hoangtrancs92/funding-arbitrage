import { Module } from '@nestjs/common';
import { OkxConnector } from './okx.connector';

@Module({
  providers: [OkxConnector],
  exports: [OkxConnector],
})
export class OkxModule {}