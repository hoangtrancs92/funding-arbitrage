import { Injectable, Logger } from '@nestjs/common';
import { FundingRate } from '../exchanges/exchange.interface';
import { ArbitrageOpportunity, ArbitrageAnalysis } from './arbitrage.interface';

@Injectable()
export class ArbitrageDetector {
  private readonly logger = new Logger(ArbitrageDetector.name);
  
  private readonly MIN_RATE_DIFFERENCE = 0.0001; // 0.01%
  private readonly MIN_EXPECTED_RETURN = 0.005; // 0.5%
  private readonly MAX_RISK_SCORE = 0.7;
  
  /**
   * Detect arbitrage opportunities from funding rates across exchanges
   */
  detectOpportunities(
    fundingRatesMap: Map<string, FundingRate[]>
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Get all unique symbols
    const allSymbols = new Set<string>();
    for (const rates of fundingRatesMap.values()) {
      rates.forEach(rate => allSymbols.add(rate.symbol));
    }
    
    // For each symbol, find arbitrage opportunities
    for (const symbol of allSymbols) {
      const symbolRates = this.getSymbolRatesAcrossExchanges(symbol, fundingRatesMap);
      
      if (symbolRates.length >= 2) {
        const symbolOpportunities = this.findArbitrageForSymbol(symbol, symbolRates);
        opportunities.push(...symbolOpportunities);
      }
    }
    
    return opportunities.sort((a, b) => b.expectedReturn - a.expectedReturn);
  }
  
  /**
   * Analyze an arbitrage opportunity for execution feasibility
   */
  analyzeOpportunity(
    opportunity: ArbitrageOpportunity,
    marketData: any = {}
  ): ArbitrageAnalysis {
    const marketConditions = this.assessMarketConditions(opportunity, marketData);
    const riskFactors = this.assessRiskFactors(opportunity, marketConditions);
    
    const overallRisk = (
      riskFactors.liquidationRisk * 0.3 +
      riskFactors.counterpartyRisk * 0.2 +
      riskFactors.marketRisk * 0.3 +
      riskFactors.operationalRisk * 0.2
    );
    
    let recommendation: 'EXECUTE' | 'MONITOR' | 'REJECT' = 'REJECT';
    const reasoning: string[] = [];
    
    if (opportunity.expectedReturn > this.MIN_EXPECTED_RETURN && overallRisk < this.MAX_RISK_SCORE) {
      if (marketConditions.liquidity > 0.7 && marketConditions.spreadStability > 0.6) {
        recommendation = 'EXECUTE';
        reasoning.push('High expected return with acceptable risk');
        reasoning.push('Good market liquidity and spread stability');
      } else {
        recommendation = 'MONITOR';
        reasoning.push('Good opportunity but market conditions need improvement');
      }
    } else {
      if (opportunity.expectedReturn <= this.MIN_EXPECTED_RETURN) {
        reasoning.push('Expected return below minimum threshold');
      }
      if (overallRisk >= this.MAX_RISK_SCORE) {
        reasoning.push('Risk score too high for execution');
      }
    }
    
    return {
      opportunity: { ...opportunity, riskScore: overallRisk },
      marketConditions,
      riskFactors,
      recommendation,
      reasoning
    };
  }
  
  private getSymbolRatesAcrossExchanges(
    symbol: string,
    fundingRatesMap: Map<string, FundingRate[]>
  ): Array<FundingRate & { exchange: string }> {
    const symbolRates: Array<FundingRate & { exchange: string }> = [];
    
    for (const [exchange, rates] of fundingRatesMap) {
      const rate = rates.find(r => r.symbol === symbol);
      if (rate) {
        symbolRates.push({ ...rate, exchange });
      }
    }
    
    return symbolRates;
  }
  
  private findArbitrageForSymbol(
    symbol: string,
    rates: Array<FundingRate & { exchange: string }>
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    
    // Sort rates to find best long and short positions
    const sortedRates = [...rates].sort((a, b) => a.fundingRate - b.fundingRate);
    
    // Check all possible combinations
    for (let i = 0; i < sortedRates.length - 1; i++) {
      for (let j = i + 1; j < sortedRates.length; j++) {
        const longRate = sortedRates[i]; // Lower funding rate (pay less)
        const shortRate = sortedRates[j]; // Higher funding rate (receive more)
        
        const rateDifference = shortRate.fundingRate - longRate.fundingRate;
        
        if (rateDifference > this.MIN_RATE_DIFFERENCE) {
          // Calculate expected return (8 hours funding period)
          const expectedReturn = rateDifference * 3; // 3 funding periods per day
          
          const opportunity: ArbitrageOpportunity = {
            id: this.generateOpportunityId(symbol, longRate.exchange, shortRate.exchange),
            symbol,
            longExchange: longRate.exchange, // Go long here (pay funding)
            shortExchange: shortRate.exchange, // Go short here (receive funding)
            longFundingRate: longRate.fundingRate,
            shortFundingRate: shortRate.fundingRate,
            rateDifference,
            expectedReturn,
            confidence: this.calculateConfidence(rateDifference),
            riskScore: 0, // Will be calculated in analysis
            minCapital: 1000, // USD
            maxCapital: 100000, // USD
            estimatedDuration: 24 * 60 * 60 * 1000, // 24 hours
            createdAt: new Date(),
            status: 'IDENTIFIED'
          };
          
          opportunities.push(opportunity);
        }
      }
    }
    
    return opportunities;
  }
  
  private calculateConfidence(rateDifference: number): number {
    // Higher rate differences generally indicate higher confidence
    const baseConfidence = Math.min(rateDifference / 0.01, 1); // Normalize to 1% difference
    return Math.max(0.1, Math.min(0.95, baseConfidence));
  }
  
  private assessMarketConditions(opportunity: ArbitrageOpportunity, marketData: any) {
    // Placeholder implementation - should use real market data
    return {
      volatility: 0.5,
      liquidity: 0.8,
      spreadStability: 0.7
    };
  }
  
  private assessRiskFactors(opportunity: ArbitrageOpportunity, marketConditions: any) {
    // Placeholder implementation - should calculate real risk factors
    return {
      liquidationRisk: 0.2,
      counterpartyRisk: 0.1,
      marketRisk: marketConditions.volatility * 0.5,
      operationalRisk: 0.15
    };
  }
  
  private generateOpportunityId(symbol: string, longExchange: string, shortExchange: string): string {
    const timestamp = Date.now();
    return `ARB_${symbol}_${longExchange}_${shortExchange}_${timestamp}`;
  }
}