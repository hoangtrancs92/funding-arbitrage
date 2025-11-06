import { ExchangeConnector, FuturesContract, FundingRate, OrderBook, Balance, Position, OrderResult } from '../exchange.interface';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BybitConnector extends ExchangeConnector {
  private readonly logger = new Logger(BybitConnector.name);
  exchangeName = 'Bybit';
  
  private baseUrl = 'https://api.bybit.com';
  private apiKey: string;
  private secretKey: string;
  
  constructor() {
    super();
    this.apiKey = process.env.BYBIT_API_KEY || '';
    this.secretKey = process.env.BYBIT_SECRET_KEY || '';
  }
  
  async getFuturesContracts(): Promise<FuturesContract[]> {
    try {
      const response = await fetch(`${this.baseUrl}/v5/market/instruments-info?category=linear`);
      const data = await response.json();
      
      return data.result.list.map((symbol: any) => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseCoin,
        quoteAsset: symbol.quoteCoin,
        contractSize: parseFloat(symbol.contractSize || '1'),
        tickSize: parseFloat(symbol.priceFilter?.tickSize || '0.01'),
        minOrderSize: parseFloat(symbol.lotSizeFilter?.minOrderQty || '0.001'),
        status: symbol.status === 'Trading' ? 'TRADING' : 'SUSPENDED'
      }));
    } catch (error) {
      this.logger.error('Failed to fetch futures contracts', error);
      throw error;
    }
  }
  
  async getFundingRates(symbols?: string[]): Promise<FundingRate[]> {
    try {
      // Bybit requires individual calls for each symbol for funding rate
      if (symbols && symbols.length > 0) {
        const promises = symbols.map(async (symbol) => {
          const response = await fetch(`${this.baseUrl}/v5/market/funding/history?category=linear&symbol=${symbol}&limit=1`);
          const data = await response.json();
          
          if (data.result.list.length > 0) {
            const rate = data.result.list[0];
            return {
              symbol: rate.symbol,
              fundingRate: parseFloat(rate.fundingRate),
              fundingTime: parseInt(rate.fundingRateTimestamp),
              nextFundingTime: parseInt(rate.fundingRateTimestamp) + 8 * 60 * 60 * 1000, // 8 hours later
            };
          }
          return null;
        });
        
        const results = await Promise.all(promises);
        return results.filter(rate => rate !== null) as FundingRate[];
      } else {
        // Get all tickers and extract funding rates
        const response = await fetch(`${this.baseUrl}/v5/market/tickers?category=linear`);
        const data = await response.json();
        
        return data.result.list.map((ticker: any) => ({
          symbol: ticker.symbol,
          fundingRate: parseFloat(ticker.fundingRate || '0'),
          fundingTime: Date.now(),
          nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
        }));
      }
    } catch (error) {
      this.logger.error('Failed to fetch funding rates', error);
      throw error;
    }
  }
  
  async getOrderBook(symbol: string, limit = 500): Promise<OrderBook> {
    try {
      const response = await fetch(`${this.baseUrl}/v5/market/orderbook?category=linear&symbol=${symbol}&limit=${Math.min(limit, 500)}`);
      const data = await response.json();
      
      return {
        symbol,
        bids: data.result.b.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
        asks: data.result.a.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
        timestamp: parseInt(data.result.ts)
      };
    } catch (error) {
      this.logger.error('Failed to fetch order book', error);
      throw error;
    }
  }
  
  async getMarkPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/v5/market/tickers?category=linear&symbol=${symbol}`);
      const data = await response.json();
      return parseFloat(data.result.list[0].markPrice);
    } catch (error) {
      this.logger.error('Failed to fetch mark price', error);
      throw error;
    }
  }
  
  async getBalances(): Promise<Balance[]> {
    throw new Error('Method not implemented');
  }
  
  async getPositions(): Promise<Position[]> {
    throw new Error('Method not implemented');
  }
  
  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number,
    timeInForce?: 'GTC' | 'IOC' | 'FOK'
  ): Promise<OrderResult> {
    throw new Error('Method not implemented');
  }
  
  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    throw new Error('Method not implemented');
  }
  
  async getOrder(symbol: string, orderId: string): Promise<OrderResult> {
    throw new Error('Method not implemented');
  }
  
  subscribeToFundingRates(symbols: string[], callback: (data: FundingRate) => void): void {
    throw new Error('Method not implemented');
  }
  
  subscribeToOrderBook(symbols: string[], callback: (data: OrderBook) => void): void {
    throw new Error('Method not implemented');
  }
  
  subscribeToUserData(callback: (data: any) => void): void {
    throw new Error('Method not implemented');
  }
}