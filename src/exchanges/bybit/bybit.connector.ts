import { ExchangeConnector, FuturesContract, FundingRate, OrderBook, Balance, Position, OrderResult } from '../exchange.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExchangeAuthUtils } from '../utils/auth.utils';
import axios from 'axios';
import { bybit } from 'ccxt';
import { calculateCoinAmountFromMargin, formatPair } from 'src/common/helper';

@Injectable()
export class BybitConnector extends ExchangeConnector {
  private readonly logger = new Logger(BybitConnector.name);
  exchangeName = 'Bybit';
  
  private baseUrl = 'https://api.bybit.com';
  private apiKey: string;
  private secretKey: string;
  
  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('BYBIT_API_KEY') || '';
    this.secretKey = this.configService.get<string>('BYBIT_SECRET_KEY') || '';
    
    // Debug logging
    this.logger.log(`🔑 Bybit API Key: ${this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'Not configured'}`);
    this.logger.log(`🔐 Bybit Secret: ${this.secretKey ? '***configured***' : 'Not configured'}`);
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
          const url = `${this.baseUrl}/v5/market/funding/history?category=linear&symbol=${symbol}&limit=1`;
          
          this.logger.debug(`Fetching Bybit funding rate for ${symbol}: ${url}`);
          
          const response = await fetch(url);
          const contentType = response.headers.get?.('content-type') || '';
          
          if (!contentType.includes('application/json')) {
            const text = await response.text();
            this.logger.warn(`Non-JSON response from Bybit funding history for ${symbol}: ${url} -> ${text.slice(0, 300)}`);
            return null;
          }
          
          const data = await response.json();
          
          if (data.retCode !== 0) {
            this.logger.warn(`Bybit API error for ${symbol}: ${data.retMsg}`);
            return null;
          }
          
          if (data.result && data.result.list && data.result.list.length > 0) {
            const rate = data.result.list[0];
            return {
              symbol: rate.symbol,
              fundingRate: parseFloat(rate.fundingRate),
              fundingTime: parseInt(rate.fundingRateTimestamp),
              nextFundingTime: Number(rate.fundingRateTimestamp), // 8 hours later
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
          fundingTime: ticker.nextFundingTime,
          nextFundingTime: Number(ticker.nextFundingTime), // Approximate next funding time
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
    // ✅ Validate credentials using utility
    const validation = ExchangeAuthUtils.validateCredentials(this.apiKey, this.secretKey);
    if (!validation.isValid) {
      // Return mock data if credentials are invalid
      this.logger.warn('Using mock balance data - API credentials not configured');
      return [
        { asset: 'USDT', free: 1000, locked: 0, total: 1000 },
      ];
    }

    try {
      const params = {
        accountType: 'UNIFIED' // Bybit unified account
      };

      // Create signed query using ExchangeAuthUtils
      const { query, signature, headers } = ExchangeAuthUtils.createBybitSignedQuery(this.apiKey, this.secretKey, params);

      const response = await axios.get(
        `${this.baseUrl}/v5/account/wallet-balance?${query}`,
        { headers }
      );

      const responseData = response.data;
      
      if (responseData.retCode !== 0) {
        throw new Error(`Bybit API Error ${responseData.retCode}: ${responseData.retMsg}`);
      }

      const accountInfo = responseData.result?.list?.[0];
      if (!accountInfo || !accountInfo.coin) {
        this.logger.warn('No balance data returned from Bybit');
        return [];
      }

      return accountInfo.coin.map((item: any) => ({
        asset: item.coin,
        free: parseFloat(item.availableToWithdraw || '0'),  // Available to withdraw
        locked: parseFloat(item.walletBalance || '0') - parseFloat(item.availableToWithdraw || '0'), // Locked
        total: parseFloat(item.walletBalance || '0'),          // Total balance
      }));

    } catch (error) {
      this.logger.error('❌ Error fetching Bybit balances:', error.response?.data || error.message);
      // Return mock data on error
      return [
        { asset: 'USDT', free: 1000, locked: 0, total: 1000 },
      ];
    }
  }
  
  async getPositions(): Promise<Position[]> {
    // ✅ Validate credentials using utility
    const validation = ExchangeAuthUtils.validateCredentials(this.apiKey, this.secretKey);
    if (!validation.isValid) {
      this.logger.warn('Using mock position data - API credentials not configured');
      return []; // Return empty array if no credentials
    }

    try {
      const params = {
        category: 'linear', // Futures positions
        settleCoin: 'USDT' // Filter by USDT settled positions
      };

      // Create signed query using ExchangeAuthUtils
      const { query, signature, headers } = ExchangeAuthUtils.createBybitSignedQuery(this.apiKey, this.secretKey, params);

      const response = await axios.get(
        `${this.baseUrl}/v5/position/list?${query}`,
        { headers }
      );

      const responseData = response.data;
      
      if (responseData.retCode !== 0) {
        throw new Error(`Bybit API Error ${responseData.retCode}: ${responseData.retMsg}`);
      }

      const positions = responseData.result?.list || [];
      
      // Filter only positions with size > 0
      const openPositions = positions
        .filter((p: any) => parseFloat(p.size || '0') > 0)
        .map((p: any) => ({
          symbol: p.symbol,
          side: p.side === 'Buy' ? 'LONG' : 'SHORT',
          size: parseFloat(p.size),
          entryPrice: parseFloat(p.avgPrice || p.entryPrice || '0'),
          markPrice: parseFloat(p.markPrice || '0'),
          unrealizedPnl: parseFloat(p.unrealisedPnl || '0'),
          percentage: parseFloat(p.unrealisedPnl || '0') / parseFloat(p.positionValue || '1') * 100,
          marginType: p.tradeMode === 0 ? 'CROSS' : 'ISOLATED'
        }));

      return openPositions;
      
    } catch (error) {
      this.logger.error('❌ Failed to fetch Bybit positions:', error.response?.data || error.message);
      return []; // Return empty array on error
    }
  }

  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    initialMargin: number,
    leverage?: number,
    marginMode: 'cross' | 'isolated' = 'isolated'
  ) {
    const exchange = new bybit({
      apiKey: this.apiKey,
      secret: this.secretKey,
      options: {
        defaultType: 'future',
      },
    });
    symbol = `${formatPair(symbol)}:USDT`;
    await exchange.loadTimeDifference();

    await exchange.fetchLeverage(symbol);
    await exchange.setMarginMode(marginMode, symbol);
    const ticker = await exchange.fetchTicker(symbol);
    const quantity = await calculateCoinAmountFromMargin(initialMargin, ticker.last, leverage || 1);
    const result = await exchange.createOrder(symbol, 'market', side.toLowerCase(), quantity);

    return result;
  }

  async cancelOrder(symbol: string, orderId: string): Promise<boolean> {
    return true;
  }

  async getOrder(symbol: string, orderId: string) {
  }
}