export interface FundingArbitrageScenario {
  id: number;
  name: string;
  description: string;
  condition: string;
  strategy: string;
  timing: string;
  minProfitThreshold: number; // minimum profit percentage to execute
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AutoTradeConfig {
  enabled: boolean;
  scenarios: FundingArbitrageScenario[];
  checkInterval: number; // minutes
  maxPositionsPerScenario: number;
  emergencyStop: {
    maxDailyLoss: number;
    maxDrawdown: number;
  };
}

export interface TradeExecution {
  id: string;
  scenarioId: number;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  longFundingRate: number;
  shortFundingRate: number;
  longPosition?: {
    size: number;
    entryPrice: number;
    orderId: string;
  };
  shortPosition?: {
    size: number;
    entryPrice: number;
    orderId: string;
  };
  expectedProfit: number;
  actualProfit: number;
  executedAt: Date;
  closeAt?: Date;
  status: 'OPENING' | 'ACTIVE' | 'CLOSING' | 'CLOSED' | 'FAILED';
}