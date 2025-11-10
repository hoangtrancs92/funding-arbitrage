export interface TradingStrategy {
  name: string;
  description: string;
  parameters: Record<string, any>;
  isActive: boolean;
}

export interface FundingArbitrageStrategy extends TradingStrategy {
  minRateDifference: number;
  maxPositionSize: number;
  maxRiskPerTrade: number;
  targetExchanges: string[];
  excludedSymbols: string[];
  rebalanceInterval: number; // milliseconds
  holdingPeriod: number; // milliseconds
}

export interface StrategySignal {
  strategyName: string;
  action: 'OPEN_LONG' | 'OPEN_SHORT' | 'CLOSE_LONG' | 'CLOSE_SHORT' | 'HOLD';
  symbol: string;
  exchange: string;
  confidence: number;
  reasoning: string[];
  parameters: Record<string, any>;
  timestamp: Date;
}

export interface StrategyPerformance {
  strategyName: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgHoldingTime: number;
  lastUpdated: Date;
}
