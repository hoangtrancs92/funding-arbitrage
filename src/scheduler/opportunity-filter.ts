export interface SimpleOpportunity {
  symbol: string;
  scenarioId: number;
  scenarioName: string;
  longExchange: string;
  shortExchange: string;
  longFundingRate: number;
  shortFundingRate: number;
  longNextFundingTime?: any;
  shortNextFundingTime?: any;
  expectedProfit: number;
  timestamp: Date;
}

export class OpportunityFilter {
  /**
   * Lọc opportunities để lấy profit cao nhất cho mỗi symbol, tránh duplicate
   */
  static filterBestBySymbol(opportunities: any[]): SimpleOpportunity[] {
    // Nhóm theo symbol
    const groupedBySymbol = new Map<string, any[]>();
    
    for (const opp of opportunities) {
      if (!groupedBySymbol.has(opp.symbol)) {
        groupedBySymbol.set(opp.symbol, []);
      }
      groupedBySymbol.get(opp.symbol)!.push(opp);
    }
    
    // Lấy opportunity có profit cao nhất cho mỗi symbol
    const bestOpportunities: SimpleOpportunity[] = [];
    
    for (const [symbol, symOpps] of groupedBySymbol.entries()) {
      // Sắp xếp theo expectedProfit giảm dần
      const sorted = symOpps.sort((a, b) => b.expectedProfit - a.expectedProfit);
      const best = sorted[0];
      // Tạo simple opportunity
      bestOpportunities.push({
        symbol: best.symbol,
        scenarioId: best.scenarioId,
        scenarioName: this.getScenarioName(best.scenarioId),
        longExchange: best.longExchange,
        shortExchange: best.shortExchange,
        longFundingRate: best.longFundingRate,
        shortFundingRate: best.shortFundingRate,
        expectedProfit: best.expectedProfit,
        timestamp: best.timestamp || new Date().toISOString()
      });
    }
    
    // Sắp xếp theo profit giảm dần
    return bestOpportunities.sort((a, b) => b.expectedProfit - a.expectedProfit);
  }
  
  private static getScenarioName(scenarioId: number): string {
    const scenarios = {
      1: 'Funding trái dấu',
      2: 'Funding lệch biên độ', 
      3: 'Gap giá futures',
      4: 'Timing desync',
      5: 'Funding đồng pha mạnh'
    };
    return scenarios[scenarioId] || `Scenario ${scenarioId}`;
  }
  
  /**
   * Lấy top N opportunities
   */
  static getTopOpportunities(opportunities: any[], limit: number = 10): SimpleOpportunity[] {
    const filtered = this.filterBestBySymbol(opportunities);
    return filtered.slice(0, limit);
  }
  
  /**
   * Thống kê đơn giản
   */
  static getSimpleStats(opportunities: SimpleOpportunity[]) {
    const totalSymbols = opportunities.length;
    const avgProfit = opportunities.reduce((sum, opp) => sum + opp.expectedProfit, 0) / totalSymbols;
    
    const scenarioCount = opportunities.reduce((count, opp) => {
      count[opp.scenarioId] = (count[opp.scenarioId] || 0) + 1;
      return count;
    }, {} as Record<number, number>);
    
    return {
      totalSymbols,
      avgProfit,
      scenarioCount,
      lastUpdated: new Date()
    };
  }
}