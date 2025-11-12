import axios from 'axios';
import { ExchangeConnector, FuturesContract, FundingRate, OrderBook, Balance, Position, OrderResult, PositionInfo } from '../exchange.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExchangeAuthUtils } from '../utils/auth.utils';
import { binance } from 'ccxt';
import { calculateCoinAmountFromMargin, formatPair, getCloseOrderParams } from 'src/common/helper';

@Injectable()
export class BinanceConnector extends ExchangeConnector {
  private readonly logger = new Logger(BinanceConnector.name);
  exchangeName = 'Binance';

  private baseUrl = 'https://fapi.binance.com';
  private apiKey: string;
  private secretKey: string;
  private exchange: binance;

  constructor(private readonly configService: ConfigService) {
    super();
    // Initialize with ConfigService để đảm bảo .env được load
    this.apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    this.secretKey = this.configService.get<string>('BINANCE_SECRET_KEY') || '';
    this.exchange = new binance({
      apiKey: this.apiKey,
      secret: this.secretKey,
      options: {
        defaultType: 'future',
      },
    });
    this.exchange.loadTimeDifference();
    // Debug logging
    this.logger.log(`🔑 Binance API Key: ${this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'Not configured'}`);
    this.logger.log(`🔐 Binance Secret: ${this.secretKey ? '***configured***' : 'Not configured'}`);
  }

  async getFuturesContracts(): Promise<FuturesContract[]> {
    try {
      // Implementation for Binance futures contracts
      const response = await this.exchange.loadMarkets();
      const data = await response.json();

      return data.symbols.map((symbol: any) => ({
        symbol: symbol.symbol,
        baseAsset: symbol.baseAsset,
        quoteAsset: symbol.quoteAsset,
        contractSize: parseFloat(symbol.contractSize || '1'),
        tickSize: parseFloat(symbol.filters.find((f: any) => f.filterType === 'PRICE_FILTER')?.tickSize || '0.01'),
        minOrderSize: parseFloat(symbol.filters.find((f: any) => f.filterType === 'LOT_SIZE')?.minQty || '0.001'),
        status: symbol.status === 'TRADING' ? 'TRADING' : 'SUSPENDED'
      }));
    } catch (error) {
      this.logger.error('Failed to fetch futures contracts', error);
      throw error;
    }
  }

  async getFundingRates(symbols?: string[]): Promise<FundingRate[]> {
    try {
      const url = symbols
        ? `${this.baseUrl}/fapi/v1/premiumIndex?symbol=${symbols.join(',')}`
        : `${this.baseUrl}/fapi/v1/premiumIndex`;

      const response = await fetch(url);
      const data = await response.json();

      const rates = Array.isArray(data) ? data : [data];

      return rates.map((rate: any) => ({
        symbol: rate.symbol,
        fundingRate: parseFloat(rate.lastFundingRate),
        fundingTime: rate.fundingTime,
        nextFundingTime: rate.nextFundingTime,
        predictedFundingRate: rate.estimatedSettlePrice ? parseFloat(rate.estimatedSettlePrice) : undefined
      }));
    } catch (error) {
      this.logger.error('Failed to fetch funding rates', error);
      throw error;
    }
  }

  async getOrderBook(symbol: string, limit = 500): Promise<OrderBook> {
    try {
      const response = await fetch(`${this.baseUrl}/fapi/v1/depth?symbol=${symbol}&limit=${limit}`);
      const data = await response.json();

      return {
        symbol,
        bids: data.bids.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
        asks: data.asks.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
        timestamp: Date.now()
      };
    } catch (error) {
      this.logger.error('Failed to fetch order book', error);
      throw error;
    }
  }

  async getMarkPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/fapi/v1/premiumIndex?symbol=${symbol}`);
      const data = await response.json();
      return parseFloat(data.markPrice);
    } catch (error) {
      this.logger.error('Failed to fetch mark price', error);
      throw error;
    }
  }

  async getBalances(): Promise<Balance> {
    // ✅ Validate credentials using utility
    const validation = ExchangeAuthUtils.validateCredentials(this.apiKey, this.secretKey);
    if (!validation.isValid) {
      throw new Error(`API credentials invalid: ${validation.errors.join(', ')}`);
    }

    try {
      const balanceData = await this.exchange.fetchBalance(
        { type: 'future' }
      )

      return balanceData['USDT'];

    } catch (error) {
      this.logger.error('❌ Error fetching Binance Futures balances:', error.response?.data || error.message);
      return Promise.reject(error);
    }
  }

  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    initialMargin: number,
    leverage?: number,
    marginMode: 'cross' | 'isolated' = 'isolated'
  ) {
    const exchange = new binance({
      apiKey: this.apiKey,
      secret: this.secretKey,
      options: {
        defaultType: 'future',
      },
    });
    symbol = `${formatPair(symbol)}`;
    // Đồng bộ server time trước khi thực hiện
    await exchange.loadTimeDifference();

    await exchange.setLeverage(leverage, symbol);
    await exchange.setMarginMode(marginMode, symbol);
    const ticker = await exchange.fetchTicker(symbol);

    const quantity = calculateCoinAmountFromMargin(initialMargin, ticker.last, leverage || 1);
    const result = await exchange.createOrder(symbol, 'market', side.toLowerCase(), quantity);
    // Cần thêm await xử lý createOrder tạo TP/SL nếu cần. 

    return result;
  }

  async getPosition(symbol:string): Promise<PositionInfo[]> {
    const position = await this.exchange.fetchPositions([symbol]);
    return position.map((p: any) => ({
      symbol: p.symbol,
      positionAmt: parseFloat(p.info.positionAmt),
      entryPrice: parseFloat(p.entryPrice),
      unrealizedPnl: parseFloat(p.unrealizedPnl),
      volume: parseInt(p.notional),
      marginType: p.marginType,
      USDValue: parseFloat(p.initialMargin),
      side: p.side.toLowerCase(),
    }));
  }

  async closePosition(symbol: string): Promise<any> {
    // Đồng bộ server time trước khi thực hiện
    await this.exchange.loadTimeDifference();
    const position = (await this.exchange.fetchPositions([symbol]))[0];
    if (!position) {
      throw new Error(`No open position found for symbol: ${symbol}`);
    }

    const { side, amount } = getCloseOrderParams(position);
    const order = await this.exchange.createOrder(symbol, 'market', side, amount, undefined, {
      reduceOnly: true,
    });

    return order;
  }

  async getFundingHistory(symbol: string, limit = 1): Promise<any[]> {
    const history = await this.exchange.fetchFundingHistory(symbol, undefined, limit);
    return history;
  }
     
}