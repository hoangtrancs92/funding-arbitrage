import { Controller, Get} from '@nestjs/common';
import { BinanceConnector } from './binance/binance.connector';
import { BybitConnector } from './bybit/bybit.connector';

@Controller('exchanges')
export class ExchangeInfoController {
    constructor(
        private readonly binanceConnector: BinanceConnector,
        private readonly bybitConnector: BybitConnector
    ) {}

  @Get('binance/balance')
  getBinanceBalance() {
    // Implementation for fetching Binance balance
    return this.binanceConnector.getBalances();
  }

  @Get('bybit/balance')
  getBybitBalance() {
    // Implementation for fetching Bybit balance
    return this.bybitConnector.getBalances();
  }

  @Get('binance/positions')
  getBinancePositions() {
    // Implementation for fetching Binance positions
    return this.binanceConnector.getPositions();
  }
}