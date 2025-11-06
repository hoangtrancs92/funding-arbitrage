export interface ArbitrageOpportunity {
  id: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  longFundingRate: number;
  shortFundingRate: number;
  rateDifference: number;
  expectedReturn: number;
  confidence: number;
  riskScore: number;
  minCapital: number;
  maxCapital: number;
  estimatedDuration: number; // in milliseconds
  createdAt: Date;
  status: 'IDENTIFIED' | 'ANALYZING' | 'READY' | 'EXECUTED' | 'CLOSED' | 'EXPIRED';
}

export interface ArbitragePosition {
  id: string;
  opportunityId: string;
  symbol: string;
  longExchange: string;
  shortExchange: string;
  longPositionId?: string;
  shortPositionId?: string;
  capitalAllocated: number;
  entryTime: Date;
  exitTime?: Date;
  realizedPnl?: number;
  unrealizedPnl: number;
  status: 'OPENING' | 'ACTIVE' | 'CLOSING' | 'CLOSED' | 'FAILED';
  fees: {
    longExchangeFee: number;
    shortExchangeFee: number;
    fundingFees: number;
  };
}

export interface ArbitrageAnalysis {
  opportunity: ArbitrageOpportunity;
  marketConditions: {
    volatility: number;
    liquidity: number;
    spreadStability: number;
  };
  riskFactors: {
    liquidationRisk: number;
    counterpartyRisk: number;
    marketRisk: number;
    operationalRisk: number;
  };
  recommendation: 'EXECUTE' | 'MONITOR' | 'REJECT';
  reasoning: string[];
}