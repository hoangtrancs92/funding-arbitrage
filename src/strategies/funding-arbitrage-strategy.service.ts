import { Injectable, Logger } from '@nestjs/common';
import {
  FundingArbitrageStrategy,
  StrategySignal,
  StrategyPerformance,
} from './strategy.interface';
import {
  ArbitrageOpportunity,
  ArbitrageAnalysis,
} from '../arbitrage/arbitrage.interface';

@Injectable()
export class FundingArbitrageStrategyService {
  private readonly logger = new Logger(FundingArbitrageStrategyService.name);

  private strategy: FundingArbitrageStrategy = {
    name: 'FundingArbitrage',
    description: 'Arbitrage funding rate differences between exchanges',
    parameters: {},
    isActive: true,
    minRateDifference: 0.0005, // 0.05%
    maxPositionSize: 20, // USD
    maxRiskPerTrade: 0.02, // 2% of portfolio
    targetExchanges: ['Binance', 'Bybit', 'OKX'],
    excludedSymbols: ['BTCUSDT'], // Exclude if needed
    rebalanceInterval: 15 * 60 * 1000, // 15 minutes
    holdingPeriod: 8 * 60 * 60 * 1000, // 8 hours (1 funding period)
  };

  private performance: StrategyPerformance = {
    strategyName: 'FundingArbitrage',
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    totalReturn: 0,
    maxDrawdown: 0,
    sharpeRatio: 0,
    avgHoldingTime: 0,
    lastUpdated: new Date(),
  };

  /**
   * Generate trading signals based on arbitrage analysis
   */
  generateSignals(analyses: ArbitrageAnalysis[]): StrategySignal[] {
    if (!this.strategy.isActive) {
      return [];
    }

    const signals: StrategySignal[] = [];

    for (const analysis of analyses) {
      const { opportunity } = analysis;

      // Check if opportunity meets strategy criteria
      if (!this.meetsStrategyCriteria(opportunity)) {
        continue;
      }

      if (analysis.recommendation === 'EXECUTE') {
        // Generate long signal for exchange with lower funding rate
        const longSignal: StrategySignal = {
          strategyName: this.strategy.name,
          action: 'OPEN_LONG',
          symbol: opportunity.symbol,
          exchange: opportunity.longExchange,
          confidence: opportunity.confidence,
          reasoning: [
            `Funding rate difference: ${(opportunity.rateDifference * 100).toFixed(4)}%`,
            `Expected return: ${(opportunity.expectedReturn * 100).toFixed(2)}%`,
            ...analysis.reasoning,
          ],
          parameters: {
            targetSize: this.calculatePositionSize(opportunity),
            stopLoss: this.calculateStopLoss(opportunity),
            takeProfit: this.calculateTakeProfit(opportunity),
          },
          timestamp: new Date(),
        };

        // Generate short signal for exchange with higher funding rate
        const shortSignal: StrategySignal = {
          strategyName: this.strategy.name,
          action: 'OPEN_SHORT',
          symbol: opportunity.symbol,
          exchange: opportunity.shortExchange,
          confidence: opportunity.confidence,
          reasoning: longSignal.reasoning,
          parameters: longSignal.parameters,
          timestamp: new Date(),
        };

        signals.push(longSignal, shortSignal);
      }
    }

    return signals;
  }

  /**
   * Update strategy parameters
   */
  updateStrategy(updates: Partial<FundingArbitrageStrategy>): void {
    this.strategy = { ...this.strategy, ...updates };
    this.logger.log(`Strategy updated: ${JSON.stringify(updates)}`);
  }

  /**
   * Get current strategy configuration
   */
  getStrategy(): FundingArbitrageStrategy {
    return { ...this.strategy };
  }

  /**
   * Get strategy performance metrics
   */
  getPerformance(): StrategyPerformance {
    return { ...this.performance };
  }

  /**
   * Update performance metrics after a trade
   */
  updatePerformance(tradeResult: {
    isWin: boolean;
    pnl: number;
    holdingTime: number;
  }): void {
    this.performance.totalTrades++;

    if (tradeResult.isWin) {
      this.performance.winningTrades++;
    } else {
      this.performance.losingTrades++;
    }

    this.performance.winRate =
      this.performance.winningTrades / this.performance.totalTrades;
    this.performance.totalReturn += tradeResult.pnl;

    // Update average holding time
    const totalTime =
      this.performance.avgHoldingTime * (this.performance.totalTrades - 1) +
      tradeResult.holdingTime;
    this.performance.avgHoldingTime = totalTime / this.performance.totalTrades;

    // Update max drawdown (simplified calculation)
    if (tradeResult.pnl < 0) {
      this.performance.maxDrawdown = Math.min(
        this.performance.maxDrawdown,
        tradeResult.pnl,
      );
    }

    this.performance.lastUpdated = new Date();

    this.logger.log(
      `Performance updated: Win rate: ${(this.performance.winRate * 100).toFixed(2)}%, Total return: ${this.performance.totalReturn.toFixed(2)}`,
    );
  }

  private meetsStrategyCriteria(opportunity: ArbitrageOpportunity): boolean {
    // Check minimum rate difference
    if (opportunity.rateDifference < this.strategy.minRateDifference) {
      return false;
    }

    // Check if exchanges are in target list
    if (
      !this.strategy.targetExchanges.includes(opportunity.longExchange) ||
      !this.strategy.targetExchanges.includes(opportunity.shortExchange)
    ) {
      return false;
    }

    // Check if symbol is excluded
    if (this.strategy.excludedSymbols.includes(opportunity.symbol)) {
      return false;
    }

    return true;
  }

  private calculatePositionSize(opportunity: ArbitrageOpportunity): number {
    // Calculate position size based on risk management
    const maxSize = Math.min(
      this.strategy.maxPositionSize,
      opportunity.maxCapital,
    );

    // Adjust size based on confidence and risk
    const confidenceMultiplier = opportunity.confidence;
    const riskMultiplier = 1 - opportunity.riskScore;

    return maxSize * confidenceMultiplier * riskMultiplier;
  }

  private calculateStopLoss(opportunity: ArbitrageOpportunity): number {
    // Stop loss at 2x the expected profit
    return opportunity.expectedReturn * -2;
  }

  private calculateTakeProfit(opportunity: ArbitrageOpportunity): number {
    // Take profit at 80% of expected return
    return opportunity.expectedReturn * 0.8;
  }
}
