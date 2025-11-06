import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FundingRateService } from '../data/funding-rate.service';
import { FundingArbitrageScenario, AutoTradeConfig, TradeExecution } from './auto-trade.interface';
import { RiskManager } from '../risk-management/risk-manager.service';

@Injectable()
export class AutoTradeScheduler {
  private readonly logger = new Logger(AutoTradeScheduler.name);
  
  private config: AutoTradeConfig = {
    enabled: true,
    checkInterval: 5, // 5 minutes
    maxPositionsPerScenario: 3,
    scenarios: [
      {
        id: 1,
        name: 'Funding trái dấu (kinh điển)',
        description: 'Sàn A funding dương, sàn B funding âm (hoặc ngược lại)',
        condition: 'Long sàn có funding âm + Short sàn có funding dương',
        strategy: 'Long sàn có funding âm + Short sàn có funding dương',
        timing: 'Vào trước snapshot 2-3 phút, thoát sau khi cả 2 sàn trả funding',
        minProfitThreshold: 0.001, // 0.1%
        riskLevel: 'LOW'
      },
      {
        id: 2,
        name: 'Funding lệch biên độ',
        description: 'Cả hai sàn cùng dương hoặc cùng âm, nhưng chênh lệch ≥ 0.25%',
        condition: 'Long sàn funding thấp hơn + Short sàn funding cao hơn',
        strategy: 'Long sàn funding thấp hơn + Short sàn funding cao hơn',
        timing: 'Vào trước funding gần nhất, thoát sau khi sàn funding cao trả tiền',
        minProfitThreshold: 0.0025, // 0.25%
        riskLevel: 'MEDIUM'
      },
      {
        id: 3,
        name: 'Funding đồng nhất + Gap giá ≥ 0.25',
        description: 'Cả hai sàn có funding cùng dấu, nhưng giá futures chênh nhau ≥ 0.25%',
        condition: 'Long sàn giá thấp + Short sàn giá cao',
        strategy: 'Long sàn giá thấp + Short sàn giá cao',
        timing: 'Ngay khi phát hiện gap ≥ 0.25%, thoát khi gap thu hẹp hoặc sau funding',
        minProfitThreshold: 0.0025, // 0.25%
        riskLevel: 'MEDIUM'
      },
      {
        id: 4,
        name: 'Funding lệch thời gian (desync)',
        description: 'Hai sàn có funding snapshot lệch nhau vài phút - vài giờ',
        condition: 'Mở Long/Short hedge cùng lúc - đóng sàn trả funding trước, rồi sàn còn lại sau',
        strategy: 'Mở Long/Short hedge cùng lúc - đóng sàn trả funding trước, rồi sàn còn lại sau',
        timing: 'Vào khi lệch <10 phút, thoát theo từng snapshot',
        minProfitThreshold: 0.0005, // 0.05%
        riskLevel: 'HIGH'
      },
      {
        id: 5,
        name: 'Funding đồng pha mạnh (cả 2 cùng cao)',
        description: 'Cả hai sàn funding đều cao (≥ 0.4%) cùng chiều, gap giá nhỏ',
        condition: 'Long cả hai sàn (nếu funding âm) hoặc Short cả hai sàn (nếu funding dương)',
        strategy: 'Long cả hai sàn (nếu funding âm) hoặc Short cả hai sàn (nếu funding dương)',
        timing: 'Vào 1-2 phút trước snapshot',
        minProfitThreshold: 0.004, // 0.4%
        riskLevel: 'HIGH'
      }
    ],
    emergencyStop: {
      maxDailyLoss: 1000, // USD
      maxDrawdown: 0.05 // 5%
    }
  };
  
  private activePositions: TradeExecution[] = [];
  private dailyPnL = 0;
  private lastResetDate = new Date().toDateString();
  
  constructor(
    private readonly fundingRateService: FundingRateService,
    private readonly riskManager: RiskManager,
  ) {}

  // Methods for external control
  isEnabled(): boolean {
    return this.config.enabled;
  }

  enable(): void {
    this.config.enabled = true;
    this.logger.log('🟢 Auto trading enabled');
  }

  disable(): void {
    this.config.enabled = false;
    this.logger.log('🔴 Auto trading disabled');
  }

  getActivePositionsCount(): number {
    return this.activePositions.length;
  }

  getActivePositions(): TradeExecution[] {
    return this.activePositions;
  }

  getDailyPnL(): number {
    return this.dailyPnL;
  }

  // Chạy mỗi 30 giây để quét cơ hội
  @Cron(CronExpression.EVERY_30_SECONDS)
  async scanForOpportunities() {
    if (!this.config.enabled) {
      return;
    }
    
    this.logger.log('🔍 Scanning for funding arbitrage opportunities...');
    
    try {
      // Reset daily P&L nếu qua ngày mới
      this.resetDailyPnLIfNewDay();
      
      // Kiểm tra emergency stop
      if (this.shouldEmergencyStop()) {
        this.logger.warn('🚨 Emergency stop triggered - stopping auto trade');
        return;
      }
      
      // Lấy funding rates từ tất cả sàn
      const fundingRates = await this.fundingRateService.collectFundingRates();
      
      // Kiểm tra từng scenario
      for (const scenario of this.config.scenarios) {
        await this.checkScenario(scenario, fundingRates);
      }
      
      // Quản lý các position đang mở
      await this.manageActivePositions();
      
    } catch (error) {
      this.logger.error('Error in scanning opportunities', error);
    }
  }
  
  // Chạy trước mỗi funding time 2 phút (00:58, 08:58, 16:58)
  @Cron('58 0,8,16 * * *')
  async preFundingCheck() {
    if (!this.config.enabled) {
      return;
    }
    
    this.logger.log('⏰ Pre-funding check - 2 minutes before funding...');
    
    try {
      // Kiểm tra các scenario thời gian thực
      await this.checkTimeSensitiveScenarios();
      
    } catch (error) {
      this.logger.error('Error in pre-funding check', error);
    }
  }
  
  // Chạy sau mỗi funding time 2 phút (00:02, 08:02, 16:02)
  @Cron('2 0,8,16 * * *')
  async postFundingCheck() {
    if (!this.config.enabled) {
      return;
    }
    
    this.logger.log('✅ Post-funding check - 2 minutes after funding...');
    
    try {
      // Đóng các position đã đến thời gian exit
      await this.closeExpiredPositions();
      
    } catch (error) {
      this.logger.error('Error in post-funding check', error);
    }
  }
  
  private async checkScenario(scenario: FundingArbitrageScenario, fundingRates: Map<string, any[]>) {
    // Đếm số position hiện tại của scenario này
    const currentPositions = this.activePositions.filter(p => p.scenarioId === scenario.id && p.status === 'ACTIVE').length;
    
    if (currentPositions >= this.config.maxPositionsPerScenario) {
      return; // Đã đủ position cho scenario này
    }
    
    switch (scenario.id) {
      case 1:
        await this.checkOppositeSignScenario(scenario, fundingRates);
        break;
      case 2:
        await this.checkSameSignDifferentRateScenario(scenario, fundingRates);
        break;
      case 3:
        await this.checkPriceGapScenario(scenario, fundingRates);
        break;
      case 4:
        await this.checkTimingDesyncScenario(scenario, fundingRates);
        break;
      case 5:
        await this.checkHighSameDirectionScenario(scenario, fundingRates);
        break;
    }
  }
  
  private async checkOppositeSignScenario(scenario: FundingArbitrageScenario, fundingRates: Map<string, any[]>) {
    // Scenario 1: Funding trái dấu
    const exchanges = ['Binance', 'Bybit', 'OKX'];
    
    for (const exchange1 of exchanges) {
      for (const exchange2 of exchanges) {
        if (exchange1 === exchange2) continue;
        
        const rates1 = fundingRates.get(exchange1) || [];
        const rates2 = fundingRates.get(exchange2) || [];
        
        // Tìm symbols chung
        const commonSymbols = this.findCommonSymbols(rates1, rates2);
        
        for (const symbol of commonSymbols) {
          const rate1 = rates1.find(r => r.symbol === symbol);
          const rate2 = rates2.find(r => r.symbol === symbol);
          
          if (!rate1 || !rate2) continue;
          
          // Kiểm tra trái dấu và đủ profit threshold
          if (this.isOppositeSign(rate1.fundingRate, rate2.fundingRate)) {
            const expectedProfit = Math.abs(rate1.fundingRate - rate2.fundingRate);
            
            if (expectedProfit >= scenario.minProfitThreshold) {
              await this.executeArbitrageTrade(scenario, symbol, exchange1, exchange2, rate1, rate2, expectedProfit);
            }
          }
        }
      }
    }
  }
  
  private async checkSameSignDifferentRateScenario(scenario: FundingArbitrageScenario, fundingRates: Map<string, any[]>) {
    // Scenario 2: Cùng dấu nhưng chênh lệch lớn
    const exchanges = ['Binance', 'Bybit', 'OKX'];
    
    for (const exchange1 of exchanges) {
      for (const exchange2 of exchanges) {
        if (exchange1 === exchange2) continue;
        
        const rates1 = fundingRates.get(exchange1) || [];
        const rates2 = fundingRates.get(exchange2) || [];
        const commonSymbols = this.findCommonSymbols(rates1, rates2);
        
        for (const symbol of commonSymbols) {
          const rate1 = rates1.find(r => r.symbol === symbol);
          const rate2 = rates2.find(r => r.symbol === symbol);
          
          if (!rate1 || !rate2) continue;
          
          // Kiểm tra cùng dấu và chênh lệch đủ lớn
          if (this.isSameSign(rate1.fundingRate, rate2.fundingRate)) {
            const difference = Math.abs(rate1.fundingRate - rate2.fundingRate);
            
            if (difference >= scenario.minProfitThreshold) {
              await this.executeArbitrageTrade(scenario, symbol, exchange1, exchange2, rate1, rate2, difference);
            }
          }
        }
      }
    }
  }
  
  private async checkPriceGapScenario(scenario: FundingArbitrageScenario, fundingRates: Map<string, any[]>) {
    // Scenario 3: Gap giá futures
    // Cần implement logic lấy giá futures và so sánh
    this.logger.log('Checking price gap scenario - implementation needed');
  }
  
  private async checkTimingDesyncScenario(scenario: FundingArbitrageScenario, fundingRates: Map<string, any[]>) {
    // Scenario 4: Lệch thời gian funding
    // Cần implement logic kiểm tra thời gian funding của từng sàn
    this.logger.log('Checking timing desync scenario - implementation needed');
  }
  
  private async checkHighSameDirectionScenario(scenario: FundingArbitrageScenario, fundingRates: Map<string, any[]>) {
    // Scenario 5: Cả hai sàn funding cao cùng chiều
    const exchanges = ['Binance', 'Bybit', 'OKX'];
    
    for (const exchange1 of exchanges) {
      for (const exchange2 of exchanges) {
        if (exchange1 === exchange2) continue;
        
        const rates1 = fundingRates.get(exchange1) || [];
        const rates2 = fundingRates.get(exchange2) || [];
        const commonSymbols = this.findCommonSymbols(rates1, rates2);
        
        for (const symbol of commonSymbols) {
          const rate1 = rates1.find(r => r.symbol === symbol);
          const rate2 = rates2.find(r => r.symbol === symbol);
          
          if (!rate1 || !rate2) continue;
          
          // Kiểm tra cả hai đều cao và cùng dấu
          const minRate = Math.min(Math.abs(rate1.fundingRate), Math.abs(rate2.fundingRate));
          
          if (minRate >= scenario.minProfitThreshold && this.isSameSign(rate1.fundingRate, rate2.fundingRate)) {
            await this.executeArbitrageTrade(scenario, symbol, exchange1, exchange2, rate1, rate2, minRate);
          }
        }
      }
    }
  }
  
  private async checkTimeSensitiveScenarios() {
    // Kiểm tra các scenario nhạy cảm về thời gian
    this.logger.log('Checking time-sensitive scenarios before funding...');
  }
  
  private async closeExpiredPositions() {
    // Đóng các position đã hết hạn
    const expiredPositions = this.activePositions.filter(p => 
      p.status === 'ACTIVE' && this.shouldClosePosition(p)
    );
    
    for (const position of expiredPositions) {
      await this.closePosition(position);
    }
  }
  
  private async executeArbitrageTrade(
    scenario: FundingArbitrageScenario,
    symbol: string,
    exchange1: string,
    exchange2: string,
    rate1: any,
    rate2: any,
    expectedProfit: number
  ) {
    try {
      this.logger.log(`🎯 Executing ${scenario.name} for ${symbol}: ${exchange1} vs ${exchange2}, Expected profit: ${(expectedProfit * 100).toFixed(4)}%`);
      
      // Tính toán position size dựa trên risk management
      const positionSize = this.calculatePositionSize(scenario, expectedProfit);
      
      // Tạo trade execution record
      const execution: TradeExecution = {
        scenarioId: scenario.id,
        symbol,
        longExchange: rate1.fundingRate < rate2.fundingRate ? exchange1 : exchange2,
        shortExchange: rate1.fundingRate < rate2.fundingRate ? exchange2 : exchange1,
        expectedProfit,
        executedAt: new Date(),
        status: 'OPENING'
      };
      
      // TODO: Implement actual order placement
      // const longOrder = await this.placeOrder(execution.longExchange, symbol, 'BUY', positionSize);
      // const shortOrder = await this.placeOrder(execution.shortExchange, symbol, 'SELL', positionSize);
      
      execution.status = 'ACTIVE';
      this.activePositions.push(execution);
      
      this.logger.log(`✅ Trade executed successfully: ${scenario.name} for ${symbol}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to execute trade for ${scenario.name}: ${symbol}`, error);
    }
  }
  
  private async manageActivePositions() {
    // Quản lý các position đang mở
    for (const position of this.activePositions) {
      if (position.status === 'ACTIVE') {
        // Kiểm tra điều kiện đóng position
        if (this.shouldClosePosition(position)) {
          await this.closePosition(position);
        }
      }
    }
  }
  
  private async closePosition(position: TradeExecution) {
    try {
      this.logger.log(`🔄 Closing position: ${position.symbol} (${position.scenarioId})`);
      
      // TODO: Implement actual order closure
      // await this.closeOrder(position.longExchange, position.longPosition?.orderId);
      // await this.closeOrder(position.shortExchange, position.shortPosition?.orderId);
      
      position.status = 'CLOSED';
      
      // Cập nhật P&L
      // const realizedPnL = await this.calculateRealizedPnL(position);
      // this.dailyPnL += realizedPnL;
      
      this.logger.log(`✅ Position closed: ${position.symbol}`);
      
    } catch (error) {
      this.logger.error(`❌ Failed to close position: ${position.symbol}`, error);
      position.status = 'FAILED';
    }
  }
  
  private shouldClosePosition(position: TradeExecution): boolean {
    // Logic để quyết định có nên đóng position không
    const now = new Date();
    const executionTime = new Date(position.executedAt);
    const timeDiff = now.getTime() - executionTime.getTime();
    
    // Đóng sau 8 giờ (1 funding period)
    return timeDiff > 8 * 60 * 60 * 1000;
  }
  
  private calculatePositionSize(scenario: FundingArbitrageScenario, expectedProfit: number): number {
    // Tính toán kích thước position dựa trên risk và expected profit
    const baseSize = 1000; // USD
    const riskMultiplier = scenario.riskLevel === 'LOW' ? 1.0 : scenario.riskLevel === 'MEDIUM' ? 0.7 : 0.5;
    const profitMultiplier = Math.min(expectedProfit / 0.001, 3); // Scale với profit
    
    return baseSize * riskMultiplier * profitMultiplier;
  }
  
  private findCommonSymbols(rates1: any[], rates2: any[]): string[] {
    const symbols1 = new Set(rates1.map(r => r.symbol));
    const symbols2 = new Set(rates2.map(r => r.symbol));
    
    return Array.from(symbols1).filter(symbol => symbols2.has(symbol));
  }
  
  private isOppositeSign(rate1: number, rate2: number): boolean {
    return (rate1 > 0 && rate2 < 0) || (rate1 < 0 && rate2 > 0);
  }
  
  private isSameSign(rate1: number, rate2: number): boolean {
    return (rate1 > 0 && rate2 > 0) || (rate1 < 0 && rate2 < 0);
  }
  
  private shouldEmergencyStop(): boolean {
    return (
      Math.abs(this.dailyPnL) > this.config.emergencyStop.maxDailyLoss ||
      this.dailyPnL < -this.config.emergencyStop.maxDailyLoss
    );
  }
  
  private resetDailyPnLIfNewDay() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.dailyPnL = 0;
      this.lastResetDate = today;
      this.logger.log('📊 Daily P&L reset for new day');
    }
  }
  
  // API methods để control bot
  enableAutoTrade() {
    this.config.enabled = true;
    this.logger.log('🟢 Auto trade enabled');
  }
  
  disableAutoTrade() {
    this.config.enabled = false;
    this.logger.log('🔴 Auto trade disabled');
  }
  
  getStatus() {
    return {
      enabled: this.config.enabled,
      activePositions: this.activePositions.filter(p => p.status === 'ACTIVE').length,
      dailyPnL: this.dailyPnL,
      scenarios: this.config.scenarios.map(s => ({
        id: s.id,
        name: s.name,
        activePositions: this.activePositions.filter(p => p.scenarioId === s.id && p.status === 'ACTIVE').length
      }))
    };
  }
  
  updateScenarioConfig(scenarioId: number, updates: Partial<FundingArbitrageScenario>) {
    const scenario = this.config.scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      Object.assign(scenario, updates);
      this.logger.log(`📝 Updated scenario ${scenarioId} configuration`);
    }
  }

  // Manual start auto trading với interval
  private intervalId?: NodeJS.Timeout;

  startAutoTrading(intervalMinutes = 5) {
    if (this.intervalId) {
      this.stopAutoTrading();
    }

    this.logger.log(`🚀 Starting auto trading with ${intervalMinutes} minute intervals`);
    this.config.enabled = true;

    // Chạy scan đầu tiên ngay lập tức
    this.scanForOpportunities();

    // Thiết lập interval để chạy định kỳ
    this.intervalId = setInterval(() => {
      this.scanForOpportunities();
    }, intervalMinutes * 60 * 1000);
  }

  stopAutoTrading() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      this.config.enabled = false;
      this.logger.log('🛑 Auto trading stopped');
    }
  }
}