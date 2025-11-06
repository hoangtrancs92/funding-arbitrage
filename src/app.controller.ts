import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import { FundingRateService } from './data/funding-rate.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly fundingRateService: FundingRateService,
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
}
