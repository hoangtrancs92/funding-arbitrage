export interface RiskParameters {
  maxLeverage: number;
  maxPositionSize: number;
  maxPortfolioRisk: number; // Percentage
  maxDailyLoss: number; // Absolute amount
  stopLossPercentage: number;
  maxOpenPositions: number;
  correlationLimit: number; // Max correlation between positions
}

export interface RiskMetrics {
  currentLeverage: number;
  portfolioValue: number;
  totalExposure: number;
  unrealizedPnl: number;
  dailyPnl: number;
  var95: number; // Value at Risk 95%
  maxDrawdown: number;
  sharpeRatio: number;
  riskScore: number; // 0-1 scale
}

export interface PositionRisk {
  positionId: string;
  symbol: string;
  exchange: string;
  size: number;
  value: number;
  leverage: number;
  liquidationPrice?: number;
  distanceToLiquidation?: number;
  var95: number;
  riskContribution: number; // Contribution to portfolio risk
}

export interface RiskAlert {
  id: string;
  type: 'LEVERAGE' | 'POSITION_SIZE' | 'CORRELATION' | 'DRAWDOWN' | 'VAR' | 'LIQUIDITY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  positions?: string[];
  recommendedActions: string[];
  timestamp: Date;
  acknowledged: boolean;
}