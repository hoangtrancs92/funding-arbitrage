import { ExchangeConnector, FuturesContract, FundingRate, OrderBook, Balance, Position, OrderResult } from '../exchange.interface';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OkxConnector extends ExchangeConnector {
  private readonly logger = new Logger(OkxConnector.name);
  exchangeName = 'OKX';
  
  private baseUrl = 'https://www.okx.com';
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  
  constructor() {
    super();
    this.apiKey = process.env.OKX_API_KEY || '';
    this.secretKey = process.env.OKX_SECRET_KEY || '';
    this.passphrase = process.env.OKX_PASSPHRASE || '';
  }
  
  async getFuturesContracts(): Promise<FuturesContract[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v5/public/instruments?instType=SWAP`);
      const data = await response.json();
      
      return data.data.map((instrument: any) => ({
        symbol: instrument.instId,
        baseAsset: instrument.baseCcy,
        quoteAsset: instrument.quoteCcy,
        contractSize: parseFloat(instrument.ctVal || '1'),
        tickSize: parseFloat(instrument.tickSz || '0.01'),
        minOrderSize: parseFloat(instrument.minSz || '0.001'),
        status: instrument.state === 'live' ? 'TRADING' : 'SUSPENDED'
      }));
    } catch (error) {
      this.logger.error('Failed to fetch futures contracts', error);
      throw error;
    }
  }
  
  async getFundingRates(symbols?: string[]): Promise<FundingRate[]> {
    try {
      if (symbols && symbols.length > 0) {
        const promises = symbols.map(async (symbol) => {
          // OKX uses different symbol format (e.g., BTC-USDT-SWAP)
          const okxSymbol = this.convertToOkxSymbol(symbol);
          const url = `${this.baseUrl}/api/v5/public/funding-rate?instId=${okxSymbol}`;
          
          this.logger.debug(`Fetching OKX funding rate for ${symbol} -> ${okxSymbol}: ${url}`);
          
          const response = await fetch(url);
          const contentType = response.headers.get?.('content-type') || '';
          
          if (!contentType.includes('application/json')) {
            const text = await response.text();
            this.logger.warn(`Non-JSON response from OKX funding-rate for ${symbol}: ${url} -> ${text.slice(0, 300)}`);
            return null;
          }
          
          const data = await response.json();
          
          if (data.code !== '0') {
            this.logger.warn(`OKX API error for ${symbol}: ${data.msg}`);
            return null;
          }
          
          if (data.data && data.data.length > 0) {
            const rate = data.data[0];
            return {
              symbol: symbol, // Return original symbol format
              fundingRate: parseFloat(rate.fundingRate),
              fundingTime: parseInt(rate.fundingTime),
              nextFundingTime: parseInt(rate.nextFundingTime),
            };
          }
          return null;
        });
        
        const results = await Promise.all(promises);
        return results.filter(rate => rate !== null) as FundingRate[];
      } else {
        // Get funding rates for all perpetual swaps
        const response = await fetch(`${this.baseUrl}/api/v5/public/funding-rate-history?instType=SWAP`);
        const data = await response.json();
        
        // Group by symbol and get the latest for each
        const ratesMap = new Map<string, FundingRate>();
        data.data.forEach((rate: any) => {
          const symbol = rate.instId;
          if (!ratesMap.has(symbol) || parseInt(rate.fundingTime) > ratesMap.get(symbol)!.fundingTime) {
            ratesMap.set(symbol, {
              symbol: rate.instId,
              fundingRate: parseFloat(rate.fundingRate),
              fundingTime: parseInt(rate.fundingTime),
              nextFundingTime: parseInt(rate.fundingTime) + 8 * 60 * 60 * 1000,
            });
          }
        });
        
        return Array.from(ratesMap.values());
      }
    } catch (error) {
      this.logger.error('Failed to fetch funding rates', error);
      throw error;
    }
  }

  /**
   * Convert standard symbol format to OKX format
   * BTCUSDT -> BTC-USDT-SWAP
   */
  private convertToOkxSymbol(symbol: string): string {
    // Remove USDT suffix and add OKX format
    if (symbol.endsWith('USDT')) {
      const base = symbol.slice(0, -4); // Remove 'USDT'
      return `${base}-USDT-SWAP`;
    }
    // Fallback: assume it's already in correct format
    return symbol;
  }
  
  async getOrderBook(symbol: string, limit = 400): Promise<OrderBook> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v5/market/books?instId=${symbol}&sz=${Math.min(limit, 400)}`);
      const data = await response.json();
      
      const orderbook = data.data[0];
      return {
        symbol,
        bids: orderbook.bids.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
        asks: orderbook.asks.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
        timestamp: parseInt(orderbook.ts)
      };
    } catch (error) {
      this.logger.error('Failed to fetch order book', error);
      throw error;
    }
  }
  
  async getMarkPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v5/market/mark-price?instType=SWAP&instId=${symbol}`);
      const data = await response.json();
      return parseFloat(data.data[0].markPx);
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