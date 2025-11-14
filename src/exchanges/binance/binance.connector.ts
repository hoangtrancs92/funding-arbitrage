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
    quantity: number
  ) {
    const entrySide = side.toLowerCase();                // buy | sell
    const oppositeSide = side === 'BUY' ? 'sell' : 'buy';
    const absQty = Math.abs(quantity);
  
    // ------- 1. ENTRY MARKET -------
    const entryOrder = await this.exchange.createOrder(
      symbol,
      'market',
      entrySide,
      absQty
    );
  
    // Lấy giá fill
    const filled = await this.exchange.fetchOrder(entryOrder.id, symbol);
    const entryPrice = filled.average;
    if (!entryPrice) throw new Error('Cannot determine filled price');
  
    // ------- 2. TÍNH TP & SL (mặc định 2%) -------
    const tpPercent = 0.014;
    const slPercent = 0.014;
  
    const takeProfitPrice =
      side === 'BUY'
        ? entryPrice * (1 + tpPercent)
        : entryPrice * (1 - tpPercent);
  
    const stopLossPrice =
      side === 'BUY'
        ? entryPrice * (1 - slPercent)
        : entryPrice * (1 + slPercent);
  
    // ------- 3. TẠO TP -------
    const tpOrder = await this.exchange.createOrder(
      symbol,
      'TAKE_PROFIT_MARKET',
      oppositeSide,
      absQty,
      undefined,
      {
        stopPrice: takeProfitPrice,
        reduceOnly: true,
      }
    );
  
    // ------- 4. TẠO SL -------
    const slOrder = await this.exchange.createOrder(
      symbol,
      'STOP_MARKET',
      oppositeSide,
      absQty,
      undefined,
      {
        stopPrice: stopLossPrice,
        reduceOnly: true,
      }
    );
    return slOrder;
  
    return {
      entryOrder,
      entryPrice,
      takeProfitPrice,
      stopLossPrice,
      tpOrder,
      slOrder
    };
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

  async closePosition(symbol: string, position: any): Promise<any> {
    const { side, amount } = getCloseOrderParams(position[0]);
    console.log(`Closing position on ${this.exchangeName}:`, { symbol, side, amount });
    const order = await this.exchange.createOrder(symbol, 'market', side, amount, undefined, {
      reduceOnly: true,
    });

    return order;
  }

  async getFundingHistory(symbol: string, limit = 1): Promise<any[]> {
    const history = await this.exchange.fetchFundingHistory(symbol, undefined, limit);
    return history;
  }

  async setUpBeforeRuns(
    symbol: string,
    initialMargin: number,
    leverage?: number,
    marginMode: 'cross' | 'isolated' = 'isolated'
  ) {
    symbol = `${formatPair(symbol)}`;

    await this.exchange.setLeverage(leverage, symbol);
    await this.exchange.setMarginMode(marginMode, symbol);
    const ticker = await this.exchange.fetchTicker(symbol);

    const quantity = calculateCoinAmountFromMargin(initialMargin, ticker.last, leverage || 1);

    return {
      symbol,
      quantity,
    }
  }

  async fetchPosition(symbol: string): Promise<any> {
    const positions = await this.exchange.fetchPositions([symbol]);
    return positions;
  }

  async TPandSLOrder(symbol: string, quantity: number, takeProfitPrice?: number, stopLossPrice?: number): Promise<any> {
    const tpOrder = await this.exchange.createOrder(
      symbol,
      'TAKE_PROFIT_MARKET',
      'BUY',
      quantity,
      undefined,
      {
        stopPrice: takeProfitPrice,
        reduceOnly: true,
      }
    );
  }
}