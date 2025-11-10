import { Injectable, Logger } from '@nestjs/common';
import {
  RiskParameters,
  RiskMetrics,
  PositionRisk,
  RiskAlert,
} from './risk.interface';
import { Position } from '../exchanges/exchange.interface';
import { ArbitragePosition } from '../arbitrage/arbitrage.interface';

@Injectable()
export class RiskManager {
  private readonly logger = new Logger(RiskManager.name);

  private riskParameters: RiskParameters = {
    maxLeverage: 10,
    maxPositionSize: 100000, // USD
    maxPortfolioRisk: 0.05, // 5%
    maxDailyLoss: 5000, // USD
    stopLossPercentage: 0.02, // 2%
    maxOpenPositions: 20,
    correlationLimit: 0.7,
  };

  private alerts: RiskAlert[] = [];

  /**
   * Evaluate if a new position can be opened based on risk parameters
   */
  evaluateNewPosition(
    symbol: string,
    exchange: string,
    positionSize: number,
    currentPositions: Position[],
    portfolioValue: number,
  ): { canOpen: boolean; reasons: string[] } {
    const reasons: string[] = [];
    let canOpen = true;

    // Check max position size
    if (positionSize > this.riskParameters.maxPositionSize) {
      canOpen = false;
      reasons.push(
        `Position size ${positionSize} exceeds maximum ${this.riskParameters.maxPositionSize}`,
      );
    }

    // Check max open positions
    if (currentPositions.length >= this.riskParameters.maxOpenPositions) {
      canOpen = false;
      reasons.push(
        `Maximum number of positions reached (${this.riskParameters.maxOpenPositions})`,
      );
    }

    // Check portfolio risk
    const portfolioRisk = positionSize / portfolioValue;
    if (portfolioRisk > this.riskParameters.maxPortfolioRisk) {
      canOpen = false;
      reasons.push(
        `Position would exceed max portfolio risk: ${(portfolioRisk * 100).toFixed(2)}% > ${(this.riskParameters.maxPortfolioRisk * 100).toFixed(2)}%`,
      );
    }

    // Check correlation with existing positions
    const correlation = this.calculateSymbolCorrelation(
      symbol,
      currentPositions,
    );
    if (correlation > this.riskParameters.correlationLimit) {
      canOpen = false;
      reasons.push(
        `High correlation ${(correlation * 100).toFixed(2)}% with existing positions`,
      );
    }

    if (canOpen) {
      reasons.push('Position meets all risk criteria');
    }

    return { canOpen, reasons };
  }

  /**
   * Calculate current portfolio risk metrics
   */
  calculateRiskMetrics(
    positions: Position[],
    portfolioValue: number,
    dailyPnl: number,
  ): RiskMetrics {
    const totalExposure = positions.reduce(
      (sum, pos) => sum + Math.abs(pos.size * pos.markPrice),
      0,
    );
    const currentLeverage =
      portfolioValue > 0 ? totalExposure / portfolioValue : 0;
    const unrealizedPnl = positions.reduce(
      (sum, pos) => sum + pos.unrealizedPnl,
      0,
    );

    // Calculate VaR (simplified using normal distribution)
    const var95 = this.calculateVaR(positions, 0.95);

    // Calculate risk score (0-1 scale)
    const leverageScore = Math.min(
      currentLeverage / this.riskParameters.maxLeverage,
      1,
    );
    const exposureScore = Math.min(totalExposure / (portfolioValue * 5), 1); // Assume 5x as max reasonable exposure
    const drawdownScore =
      Math.abs(Math.min(dailyPnl, 0)) / this.riskParameters.maxDailyLoss;

    const riskScore =
      leverageScore * 0.4 + exposureScore * 0.3 + drawdownScore * 0.3;

    return {
      currentLeverage,
      portfolioValue,
      totalExposure,
      unrealizedPnl,
      dailyPnl,
      var95,
      maxDrawdown: Math.abs(Math.min(dailyPnl, 0)),
      sharpeRatio: 0, // Would need historical data to calculate
      riskScore: Math.min(riskScore, 1),
    };
  }

  /**
   * Calculate individual position risks
   */
  calculatePositionRisks(positions: Position[]): PositionRisk[] {
    return positions.map((position) => {
      const value = Math.abs(position.size * position.markPrice);
      const leverage = position.marginType === 'CROSS' ? 1 : 10; // Simplified

      // Calculate distance to liquidation (simplified)
      const distanceToLiquidation =
        position.side === 'LONG'
          ? (position.markPrice - position.entryPrice * 0.9) /
            position.markPrice
          : (position.entryPrice * 1.1 - position.markPrice) /
            position.markPrice;

      // Calculate position VaR
      const positionVar = value * 0.02 * 2.33; // 2% volatility * 2.33 (95% confidence)

      return {
        positionId: `${position.symbol}_${Date.now()}`,
        symbol: position.symbol,
        exchange: 'Unknown', // Would need to be passed in
        size: position.size,
        value,
        leverage,
        liquidationPrice:
          position.side === 'LONG'
            ? position.entryPrice * 0.9
            : position.entryPrice * 1.1,
        distanceToLiquidation: Math.max(0, distanceToLiquidation),
        var95: positionVar,
        riskContribution: positionVar / this.calculateTotalVaR(positions),
      };
    });
  }

  /**
   * Monitor positions and generate risk alerts
   */
  monitorRisks(positions: Position[], riskMetrics: RiskMetrics): RiskAlert[] {
    const newAlerts: RiskAlert[] = [];

    // Check leverage alert
    if (riskMetrics.currentLeverage > this.riskParameters.maxLeverage * 0.8) {
      newAlerts.push({
        id: `LEVERAGE_${Date.now()}`,
        type: 'LEVERAGE',
        severity:
          riskMetrics.currentLeverage > this.riskParameters.maxLeverage
            ? 'CRITICAL'
            : 'HIGH',
        message: `Portfolio leverage ${riskMetrics.currentLeverage.toFixed(2)}x approaching limit ${this.riskParameters.maxLeverage}x`,
        recommendedActions: ['Reduce position sizes', 'Close some positions'],
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Check daily loss alert
    if (riskMetrics.dailyPnl < -this.riskParameters.maxDailyLoss * 0.8) {
      newAlerts.push({
        id: `DRAWDOWN_${Date.now()}`,
        type: 'DRAWDOWN',
        severity:
          riskMetrics.dailyPnl < -this.riskParameters.maxDailyLoss
            ? 'CRITICAL'
            : 'HIGH',
        message: `Daily loss ${riskMetrics.dailyPnl.toFixed(2)} approaching limit ${-this.riskParameters.maxDailyLoss}`,
        recommendedActions: [
          'Stop trading for today',
          'Review strategy parameters',
        ],
        timestamp: new Date(),
        acknowledged: false,
      });
    }

    // Check individual position risks
    const positionRisks = this.calculatePositionRisks(positions);
    for (const positionRisk of positionRisks) {
      if (
        positionRisk.distanceToLiquidation &&
        positionRisk.distanceToLiquidation < 0.1
      ) {
        newAlerts.push({
          id: `LIQUIDATION_${positionRisk.positionId}_${Date.now()}`,
          type: 'POSITION_SIZE',
          severity:
            positionRisk.distanceToLiquidation < 0.05 ? 'CRITICAL' : 'HIGH',
          message: `Position ${positionRisk.symbol} close to liquidation: ${(positionRisk.distanceToLiquidation * 100).toFixed(2)}%`,
          positions: [positionRisk.positionId],
          recommendedActions: [
            'Add margin',
            'Reduce position size',
            'Close position',
          ],
          timestamp: new Date(),
          acknowledged: false,
        });
      }
    }

    this.alerts.push(...newAlerts);
    return newAlerts;
  }

  /**
   * Get current risk parameters
   */
  getRiskParameters(): RiskParameters {
    return { ...this.riskParameters };
  }

  /**
   * Update risk parameters
   */
  updateRiskParameters(updates: Partial<RiskParameters>): void {
    this.riskParameters = { ...this.riskParameters, ...updates };
    this.logger.log(`Risk parameters updated: ${JSON.stringify(updates)}`);
  }

  /**
   * Get all unacknowledged alerts
   */
  getActiveAlerts(): RiskAlert[] {
    return this.alerts.filter((alert) => !alert.acknowledged);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  private calculateVaR(positions: Position[], confidence: number): number {
    // Simplified VaR calculation
    const totalValue = positions.reduce(
      (sum, pos) => sum + Math.abs(pos.size * pos.markPrice),
      0,
    );
    const volatility = 0.02; // Assume 2% daily volatility
    const zScore = confidence === 0.95 ? 1.645 : 2.33; // 95% or 99%

    return totalValue * volatility * zScore;
  }

  private calculateTotalVaR(positions: Position[]): number {
    return this.calculateVaR(positions, 0.95);
  }

  private calculateSymbolCorrelation(
    symbol: string,
    positions: Position[],
  ): number {
    // Simplified correlation calculation
    // In practice, you would calculate actual correlation using price history
    const sameAssetPositions = positions.filter((pos) => pos.symbol === symbol);
    return sameAssetPositions.length > 0 ? 0.8 : 0; // Assume high correlation with same symbol
  }
}
