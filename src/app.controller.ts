import { Controller, Get, Res, Post, Body, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { FundingRateService } from './data/funding-rate.service';
import { BinanceConnector } from './exchanges/binance/binance.connector';
import { BybitConnector } from './exchanges/bybit/bybit.connector';
import { MexcConnector } from './exchanges/mexc/mexc.connector';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly fundingRateService: FundingRateService,
    private readonly binanceConnector: BinanceConnector,
    private readonly bybitConnector: BybitConnector,
    private readonly mexcConnector: MexcConnector,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('status')
  getStatus() {
    return {
      status: 'running',
      timestamp: new Date(),
      message: 'Funding Rate Arbitrage Bot is operational',
    };
  }

  @Get('health')
  async getHealth() {
    try {
      // Quick health check by fetching a small amount of data
      const fundingRates = await this.fundingRateService.collectFundingRates(['BTCUSDT']);

      return {
        status: 'healthy',
        timestamp: new Date(),
        exchanges: {
          binance: fundingRates.has('Binance'),
          bybit: fundingRates.has('Bybit'),
          okx: fundingRates.has('OKX'),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        error: error.message,
      };
    }
  }

  @Get('dashboard')
  getDashboard(@Res() res) {
    const path = require('path');
    return res.sendFile(path.join(__dirname, '..', 'src', 'public', 'dashboard.html'));
  }

  // ===== TEST ENDPOINTS =====

  @Get('test/binance/balance')
  async getBinanceBalance() {
    try {
      const balances = await this.binanceConnector.getBalances();
      return {
        success: true,
        data: balances,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Post('test/binance/cancel-order/')
  async testBinanceCancelOrder(@Body() body: {
    symbol: string;
  }) {
    try {
      const binnancePosition = await this.binanceConnector.fetchPosition(body.symbol);

      const result = await this.binanceConnector.closePosition(body.symbol, binnancePosition);
      return { result };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('test/binance/position/')
  async testBinanceGetPosition(@Body() body: {
    symbol: string;
  }) {
    try {
      const position = await this.binanceConnector.getPosition(body.symbol);
      return { position };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  @Get('test/binance/funding-history/')
  async testBinanceGetFundingHistory(@Body() body: {
    symbol: string;
    limit?: number;
  }) {
    try {
      const history = await this.binanceConnector.getFundingHistory(body.symbol, body.limit);
      return { history };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // === BYBIT TEST ENDPOINTS ===

  @Get('test/bybit/balance')
  async getBybitBalance() {
    try {
      const balances = await this.bybitConnector.getBalances();
      return {
        success: true,
        data: balances,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // @Post('test/bybit/order/')
  // async testBybitOrder(@Body() body: {
  //   symbol: string;
  //   side: 'BUY' | 'SELL';
  //   initialMargin: number; // USDT margin amount
  //   leverage?: number;
  //   marginMode?: 'isolated' | 'cross';
  // }) {
  //   try {
  //     const orderResult = await this.bybitConnector.placeOrder(
  //       body.symbol,
  //       body.side,
  //       body.initialMargin,
  //       body.leverage,
  //       body.marginMode
  //     );
  //     return { orderResult };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error.message
  //     };
  //   }
  // }

  @Post('test/bybit/cancel-order/')
  async testBybitCancelOrder(@Body() body: {
    symbol: string;
  }) {
    try {
      const bybitPosition = await this.bybitConnector.fetchPosition(body.symbol);
      const result = await this.bybitConnector.closePosition(body.symbol, bybitPosition);
      return { result };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // @Post('test/long-binance-short-bybit/')
  // testLongBinanceShortBybit(@Body() body: {
  //   symbol: string;
  //   initialMargin: number;
  //   leverage: number; // USDT margin amount
  // }) {
  //   try {
  //     // Step 1: Open a long position on Binance
  //     const binanceOrder = this.binanceConnector.placeOrder(
  //       body.symbol,
  //       'BUY',
  //       body.initialMargin,
  //       body.leverage
  //     );

  //     // Step 2: Open a short position on Bybit
  //     const bybitOrder = this.bybitConnector.placeOrder(
  //       body.symbol,
  //       'SELL',
  //       body.initialMargin,
  //       body.leverage
  //     );

  //     return {
  //       success: true,
  //       binanceOrder,
  //       bybitOrder
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error.message
  //     };
  //   }
  // }

  // @Post('test/long-bybit-short-binance/')
  //  testLongBybitShortBinance(@Body() body: {
  //   symbol: string;
  //   initialMargin: number;
  //   leverage: number;
  // }) {
  //   try {
  //     // Step 1: Open a long position on Bybit
  //     const bybitOrder =  this.bybitConnector.placeOrder(
  //       body.symbol,
  //       'BUY',
  //       body.initialMargin,
  //       body.leverage
  //     );

  //     // Step 2: Open a short position on Binance
  //     const binanceOrder =  this.binanceConnector.placeOrder(
  //       body.symbol,
  //       'SELL',
  //       body.initialMargin,
  //       body.leverage
  //     );

  //     return {
  //       success: true,
  //       bybitOrder,
  //       binanceOrder
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error.message
  //     };
  //   }
  // }

  // @Post('test/cancel-2-way-positions/')
  //  cancelTwoWayPositions(@Body() body: {
  //   symbol: string;
  // }) {
  //   try {
  //     // Step 1: Close long position on Binance
  //     const binanceClose =  this.binanceConnector.closePosition(body.symbol);

  //     // Step 2: Close short position on Bybit
  //     const bybitClose =  this.bybitConnector.closePosition(body.symbol);

  //     return {
  //       success: true,
  //       binanceClose,
  //       bybitClose
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       error: error.message
  //     };
  //   }
  // }

  @Get('test/mexc/getFuturesContracts')
  async testMexcGetFuturesContracts() {
    try {
      const markets = await this.mexcConnector.getFuturesContracts();
      return {
        success: true,
        data: markets,
        message: `Retrieved ${markets.length} futures contracts from MEXC`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}
