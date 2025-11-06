import { Injectable, Logger } from '@nestjs/common';
import { BinanceConnector } from '../exchanges/binance/binance.connector';
import { BybitConnector } from '../exchanges/bybit/bybit.connector';
import { OkxConnector } from '../exchanges/okx/okx.connector';
import { ArbitrageDetector } from '../arbitrage/arbitrage-detector.service';
import { FundingArbitrageStrategyService } from '../strategies/funding-arbitrage-strategy.service';
import { RiskManager } from '../risk-management/risk-manager.service';
import { FundingRate } from '../exchanges/exchange.interface';

@Injectable()
export class FundingRateService {
  private readonly logger = new Logger(FundingRateService.name);
  
  constructor(
    private readonly binanceConnector: BinanceConnector,
    private readonly bybitConnector: BybitConnector,
    private readonly okxConnector: OkxConnector,
    private readonly arbitrageDetector: ArbitrageDetector,
    private readonly strategyService: FundingArbitrageStrategyService,
    private readonly riskManager: RiskManager,
  ) {}
  
  /**
   * Collect funding rates from all exchanges
   */
  async collectFundingRates(symbols?: string[]): Promise<Map<string, FundingRate[]>> {
    const fundingRatesMap = new Map<string, FundingRate[]>();
    
    try {
      // Collect from Binance
      const binanceRates = await this.binanceConnector.getFundingRates(symbols);
      fundingRatesMap.set('Binance', binanceRates);
      this.logger.log(`Collected ${binanceRates.length} funding rates from Binance`);
    } catch (error) {
      this.logger.error('Failed to collect Binance funding rates', error);
    }
    
    try {
      // Collect from Bybit
      const bybitRates = await this.bybitConnector.getFundingRates(symbols);
      fundingRatesMap.set('Bybit', bybitRates);
      this.logger.log(`Collected ${bybitRates.length} funding rates from Bybit`);
    } catch (error) {
      this.logger.error('Failed to collect Bybit funding rates', error);
    }
    
    try {
      // Collect from OKX
      const okxRates = await this.okxConnector.getFundingRates(symbols);
      fundingRatesMap.set('OKX', okxRates);
      this.logger.log(`Collected ${okxRates.length} funding rates from OKX`);
    } catch (error) {
      this.logger.error('Failed to collect OKX funding rates', error);
    }

    return fundingRatesMap;
  }
  
  /**
   * Find and analyze arbitrage opportunities
   */
  async findArbitrageOpportunities(symbols?: string[]) {
    this.logger.log('Starting arbitrage opportunity scan...');
    
    // Collect funding rates from all exchanges
    const fundingRatesMap = await this.collectFundingRates(symbols);
    
    // Detect arbitrage opportunities
    const opportunities = this.arbitrageDetector.detectOpportunities(fundingRatesMap);
    this.logger.log(`Found ${opportunities.length} potential arbitrage opportunities`);
    
    // Analyze each opportunity
    const analyses = opportunities.map(opportunity => 
      this.arbitrageDetector.analyzeOpportunity(opportunity)
    );
    
    // Generate trading signals
    const signals = this.strategyService.generateSignals(analyses);
    this.logger.log(`Generated ${signals.length} trading signals`);
    
    return {
      fundingRates: fundingRatesMap,
      opportunities,
      analyses,
      signals,
    };
  }
  
  /**
   * Get funding rates for a specific symbol across all exchanges
   */
  async getSymbolFundingRates(symbol: string): Promise<{
    symbol: string;
    rates: Array<FundingRate & { exchange: string }>;
  }> {
    const allRates = await this.collectFundingRates([symbol]);
    const symbolRates: Array<FundingRate & { exchange: string }> = [];
    
    for (const [exchange, rates] of allRates) {
      const rate = rates.find(r => r.symbol === symbol);
      if (rate) {
        symbolRates.push({ ...rate, exchange });
      }
    }
    
    return {
      symbol,
      rates: symbolRates.sort((a, b) => a.fundingRate - b.fundingRate),
    };
  }
  
  /**
   * Get top funding rate opportunities
   */
  async getTopOpportunities(limit = 10) {
    const result = await this.findArbitrageOpportunities();
    
    return {
      opportunities: result.opportunities
        .slice(0, limit)
        .map(opp => ({
          ...opp,
          analysis: result.analyses.find(a => a.opportunity.id === opp.id),
        })),
      totalFound: result.opportunities.length,
    };
  }
  
  /**
   * Start continuous monitoring
   */
  async startMonitoring(intervalMinutes = 5) {
    this.logger.log(`Starting continuous monitoring every ${intervalMinutes} minutes`);
    
    const monitor = async () => {
      try {
        const result = await this.findArbitrageOpportunities();
        
        // Log summary
        const executableOpportunities = result.analyses.filter(a => a.recommendation === 'EXECUTE');
        this.logger.log(`Monitoring update: ${result.opportunities.length} opportunities found, ${executableOpportunities.length} executable`);
        
        // Here you could implement automatic execution or send notifications
        
      } catch (error) {
        this.logger.error('Error during monitoring cycle', error);
      }
    };
    
    // Initial scan
    await monitor();
    
    // Set up recurring monitoring
    setInterval(monitor, intervalMinutes * 60 * 1000);
  }
}