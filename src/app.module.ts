import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { DataModule } from './data/data.module';
import { ArbitrageModule } from './arbitrage/arbitrage.module';
import { StrategiesModule } from './strategies/strategies.module';
import { RiskManagementModule } from './risk-management/risk-management.module';
import { ApiModule } from './api/api.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { WebSocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule,
    ExchangesModule,
    DataModule,
    ArbitrageModule,
    StrategiesModule,
    RiskManagementModule,
    ApiModule,
    SchedulerModule,
    WebSocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
