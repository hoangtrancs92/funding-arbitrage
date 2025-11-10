export interface OptimizedOpportunity {
  symbol: string;
  scenarioId: number;
  scenarioName: string;
  longExchange: string;
  shortExchange: string;
  longFundingRate: number;
  shortFundingRate: number;
  expectedProfit: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: number; // Càng cao càng ưu tiên
  timing: string;
  lastUpdated: Date;
}

export interface OpportunityAnalysis {
  symbol: string;
  opportunities: OptimizedOpportunity[];
  bestOpportunity: OptimizedOpportunity;
  totalOpportunities: number;
}
