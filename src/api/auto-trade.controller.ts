import { Controller, Get, Post, Query } from '@nestjs/common';
import { AutoTradeScheduler } from '../scheduler/auto-trade.scheduler';

@Controller('auto-trade')
export class AutoTradeController {
  constructor(private readonly autoTradeScheduler: AutoTradeScheduler) {}

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
  getPositions() {
    return {
      positions: this.autoTradeScheduler.getActivePositions()
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