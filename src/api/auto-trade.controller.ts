import { Controller, Get, Post, Query } from '@nestjs/common';
import { AutoTradeScheduler } from '../scheduler/auto-trade.scheduler';
import { FundingRateService } from '../data/funding-rate.service';

@Controller('auto-trade')
export class AutoTradeController {
  constructor(
    private readonly autoTradeScheduler: AutoTradeScheduler,
    private readonly fundingRateService: FundingRateService,
  ) {}

  @Get('status')
  getStatus() {
    return {
      enabled: this.autoTradeScheduler.isEnabled(),
      activePositions: this.autoTradeScheduler.getActivePositionsCount(),
      dailyPnL: this.autoTradeScheduler.getDailyPnL(),
      scenarios: [
        {
          name: 'Opposite Sign Funding',
          activePositions: 0,
          riskLevel: 'MEDIUM',
          description: 'Funding rates có dấu ngược nhau giữa các sàn'
        },
        {
          name: 'High Rate Difference',
          activePositions: 0,
          riskLevel: 'LOW',
          description: 'Chênh lệch funding rate ≥ 0.25% cùng dấu'
        },
        {
          name: 'Price Gap Arbitrage',
          activePositions: 0,
          riskLevel: 'HIGH',
          description: 'Chênh lệch giá với cùng hướng funding'
        },
        {
          name: 'Timing Desync',
          activePositions: 0,
          riskLevel: 'MEDIUM',
          description: 'Lệch thời gian funding giữa các sàn'
        },
        {
          name: 'High Same Direction',
          activePositions: 0,
          riskLevel: 'LOW',
          description: 'Funding rate cao cùng chiều'
        }
      ]
    };
  }

  @Get('positions')
  async getPositions() {
    // Trả về optimized opportunities thay vì raw positions
    const bestOpportunities = this.autoTradeScheduler.getBestOpportunities();
    
    // Lấy thông tin funding time cho từng symbol/exchange
    const fundingData = await this.fundingRateService.collectFundingRates();
    
    return {
      positions: bestOpportunities.map(opportunity => {
        // Tìm funding time cho long và short exchange
        const longRates = fundingData.get(opportunity.longExchange) || [];
        const shortRates = fundingData.get(opportunity.shortExchange) || [];

        const longRate = longRates.find(r => r.symbol === opportunity.symbol);
        const shortRate = shortRates.find(r => r.symbol === opportunity.symbol);
        console.log('longRate.nextFundingTime:', longRate?.nextFundingTime);
        return {
          symbol: opportunity.symbol,
          scenarioId: opportunity.scenarioId,
          longExchange: opportunity.longExchange,
          shortExchange: opportunity.shortExchange,
          expectedProfit: opportunity.expectedProfit,
          longFundingTime: longRate?.nextFundingTime ? new Date(Number(longRate.nextFundingTime)) : null,
          shortFundingTime: shortRate?.nextFundingTime ? new Date(Number(shortRate.nextFundingTime)) : null,
          longFundingRate: longRate?.fundingRate || 0,
          shortFundingRate: shortRate?.fundingRate || 0,
          timestamp: opportunity.timestamp
        };
      }),
      total: bestOpportunities.length,
      lastUpdated: new Date(),
      fundingRates: Object.fromEntries(fundingData), // Include full funding data
      statistics: this.autoTradeScheduler.getOpportunityStatistics()
    };
  }

  @Post('start')
  startAutoTrade(@Query('interval') interval: string = '5') {
    const intervalMinutes = parseInt(interval) || 5;
    this.autoTradeScheduler.enable();
    return {
      message: `Auto trading started with ${intervalMinutes} minute interval`,
      enabled: true
    };
  }

  @Post('stop')
  stopAutoTrade() {
    this.autoTradeScheduler.disable();
    return {
      message: 'Auto trading stopped',
      enabled: false
    };
  }

  @Post('force-scan')
  async forceScan() {
    try {
      await this.autoTradeScheduler.scanForOpportunities();
      return {
        message: 'Force scan completed successfully'
      };
    } catch (error) {
      return {
        message: 'Force scan failed: ' + error.message,
        error: error.message
      };
    }
  }
}