import { Controller, Get, Res, Post, Body, Logger } from '@nestjs/common';
import { AppService } from './app.service';
import { FundingRateService } from './data/funding-rate.service';
import { BinanceConnector } from './exchanges/binance/binance.connector';
import { BybitConnector } from './exchanges/bybit/bybit.connector';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    private readonly fundingRateService: FundingRateService,
    private readonly binanceConnector: BinanceConnector,
    private readonly bybitConnector: BybitConnector,
  ) {}

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
        message: `Retrieved ${balances.length} balance entries from Binance`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

@Post('test/binance/order/market')
async testBinanceMarketOrder(@Body() body: { 
  symbol: string; 
  side: 'BUY' | 'SELL'; 
  initialMargin: number; // USDT margin amount
  leverage?: number;
  marginMode?: 'isolated' | 'cross';
}) {
  try {
    const orderResult = await this.binanceConnector.placeOrder(
      body.symbol,
      body.side,
      body.initialMargin,
      body.leverage,
      body.marginMode
    );
    return { orderResult };
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
        message: `Retrieved ${balances.length} balance entries from Bybit`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message  
      };
    }
  }
}
