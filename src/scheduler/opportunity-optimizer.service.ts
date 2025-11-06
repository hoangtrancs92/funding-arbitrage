import { Injectable, Logger } from '@nestjs/common';
import { OptimizedOpportunity, OpportunityAnalysis } from './opportunity.interface';
import { FundingArbitrageScenario } from './auto-trade.interface';

@Injectable()
export class OpportunityOptimizer {
  private readonly logger = new Logger(OpportunityOptimizer.name);
  private currentOpportunities: Map<string, OpportunityAnalysis> = new Map();

  /**
   * Phân tích và tối ưu hóa opportunities, tránh duplicate
   */
  optimizeOpportunities(
    rawOpportunities: any[],
    scenarios: FundingArbitrageScenario[]
  ): OpportunityAnalysis[] {
    // Reset opportunities map
    this.currentOpportunities.clear();

    // Nhóm opportunities theo symbol
    for (const opportunity of rawOpportunities) {
      this.addOrUpdateOpportunity(opportunity, scenarios);
    }

    // Trả về danh sách đã tối ưu hóa
    return Array.from(this.currentOpportunities.values());
  }

  /**
   * Thêm hoặc cập nhật opportunity cho một symbol
   */
  private addOrUpdateOpportunity(opportunity: any, scenarios: FundingArbitrageScenario[]) {
    const symbol = opportunity.symbol;
    const scenario = scenarios.find(s => s.id === opportunity.scenarioId);

    if (!scenario) {
      return;
    }

    // Tạo OptimizedOpportunity
    const optimizedOpp: OptimizedOpportunity = {
      symbol,
      scenarioId: opportunity.scenarioId,
      scenarioName: scenario.name,
      longExchange: opportunity.longExchange,
      shortExchange: opportunity.shortExchange,
      longFundingRate: opportunity.longFundingRate,
      shortFundingRate: opportunity.shortFundingRate,
      expectedProfit: opportunity.expectedProfit,
      confidence: this.calculateConfidence(opportunity, scenario),
      riskLevel: scenario.riskLevel,
      priority: this.calculatePriority(opportunity, scenario),
      timing: scenario.timing,
      lastUpdated: new Date()
    };

    // Lấy phân tích hiện tại của symbol hoặc tạo mới
    let analysis = this.currentOpportunities.get(symbol);
    if (!analysis) {
      analysis = {
        symbol,
        opportunities: [],
        bestOpportunity: optimizedOpp,
        totalOpportunities: 0
      };
    }

    // Thêm opportunity vào danh sách
    analysis.opportunities.push(optimizedOpp);

    // Cập nhật best opportunity (priority cao nhất)
    if (optimizedOpp.priority > analysis.bestOpportunity.priority) {
      analysis.bestOpportunity = optimizedOpp;
    }

    analysis.totalOpportunities = analysis.opportunities.length;
    this.currentOpportunities.set(symbol, analysis);
  }

  /**
   * Tính toán confidence score (0-1)
   */
  private calculateConfidence(opportunity: any, scenario: FundingArbitrageScenario): number {
    let confidence = 0.5; // Base confidence

    // Tăng confidence dựa trên expected profit
    const profitMultiplier = opportunity.expectedProfit / scenario.minProfitThreshold;
    confidence += Math.min(profitMultiplier * 0.2, 0.3);

    // Tăng confidence dựa trên risk level (LOW risk = high confidence)
    switch (scenario.riskLevel) {
      case 'LOW':
        confidence += 0.2;
        break;
      case 'MEDIUM':
        confidence += 0.1;
        break;
      case 'HIGH':
        confidence += 0.0;
        break;
    }

    // Tăng confidence cho funding trái dấu (scenario 1)
    if (scenario.id === 1) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Tính toán priority score (càng cao càng ưu tiên)
   */
  private calculatePriority(opportunity: any, scenario: FundingArbitrageScenario): number {
    let priority = 0;

    // Priority dựa trên expected profit (weight: 40%)
    priority += opportunity.expectedProfit * 1000 * 0.4;

    // Priority dựa trên scenario type (weight: 30%)
    const scenarioPriority = {
      1: 100, // Funding trái dấu - ưu tiên cao nhất
      2: 80,  // Funding lệch biên độ
      3: 70,  // Gap giá
      5: 60,  // Funding đồng pha mạnh
      4: 40   // Timing desync - rủi ro cao nhất
    };
    priority += (scenarioPriority[scenario.id] || 50) * 0.3;

    // Priority dựa trên risk level (weight: 20%)
    const riskPriority = {
      'LOW': 30,
      'MEDIUM': 20,
      'HIGH': 10
    };
    priority += riskPriority[scenario.riskLevel] * 0.2;

    // Bonus cho funding rate cao
    const avgFundingRate = (Math.abs(opportunity.longFundingRate) + Math.abs(opportunity.shortFundingRate)) / 2;
    priority += avgFundingRate * 100 * 0.1;

    return priority;
  }

  /**
   * Lấy top opportunities (chỉ best opportunity của mỗi symbol)
   */
  getBestOpportunities(limit: number = 10): OptimizedOpportunity[] {
    const bestOpportunities = Array.from(this.currentOpportunities.values())
      .map(analysis => analysis.bestOpportunity)
      .sort((a, b) => b.priority - a.priority)
      .slice(0, limit);

    return bestOpportunities;
  }

  /**
   * Lấy tất cả opportunities của một symbol
   */
  getSymbolOpportunities(symbol: string): OpportunityAnalysis | null {
    return this.currentOpportunities.get(symbol) || null;
  }

  /**
   * Kiểm tra xem có opportunity nào cho symbol không
   */
  hasOpportunityForSymbol(symbol: string): boolean {
    const analysis = this.currentOpportunities.get(symbol);
    return !!(analysis && analysis.opportunities.length > 0);
  }

  /**
   * Lấy thống kê tổng quan
   */
  getStatistics() {
    const totalSymbols = this.currentOpportunities.size;
    const totalOpportunities = Array.from(this.currentOpportunities.values())
      .reduce((sum, analysis) => sum + analysis.totalOpportunities, 0);
    
    const riskLevelCount = Array.from(this.currentOpportunities.values())
      .reduce((count, analysis) => {
        const riskLevel = analysis.bestOpportunity.riskLevel;
        count[riskLevel] = (count[riskLevel] || 0) + 1;
        return count;
      }, {} as Record<string, number>);

    const scenarioCount = Array.from(this.currentOpportunities.values())
      .reduce((count, analysis) => {
        const scenarioId = analysis.bestOpportunity.scenarioId;
        count[scenarioId] = (count[scenarioId] || 0) + 1;
        return count;
      }, {} as Record<number, number>);

    return {
      totalSymbols,
      totalOpportunities,
      riskLevelCount,
      scenarioCount,
      lastUpdated: new Date()
    };
  }
}