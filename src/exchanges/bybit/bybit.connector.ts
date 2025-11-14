import { ExchangeConnector, FuturesContract, FundingRate, OrderBook, Balance, Position, OrderResult, PositionInfo } from '../exchange.interface';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExchangeAuthUtils } from '../utils/auth.utils';
import axios from 'axios';
import { bybit } from 'ccxt';
import { calculateCoinAmountFromMargin, formatPair, getCloseOrderParams } from 'src/common/helper';

@Injectable()
export class BybitConnector extends ExchangeConnector {
  private readonly logger = new Logger(BybitConnector.name);
  exchangeName = 'Bybit';

  private baseUrl = 'https://api.bybit.com';
  private apiKey: string;
  private secretKey: string;
  private exchange: bybit;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiKey = this.configService.get<string>('BYBIT_API_KEY') || '';
    this.secretKey = this.configService.get<string>('BYBIT_SECRET_KEY') || '';
    this.exchange = new bybit({
      apiKey: this.apiKey,
      secret: this.secretKey,
      options: {
        defaultType: 'future',
      },
    });
    this.exchange.loadTimeDifference();

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

  async getBalances(): Promise<Balance> {
    try {
      const balanceData = await this.exchange.fetchBalance(
        { type: 'future' }
      )

      return balanceData['USDT'];
    } catch (error) {
      this.logger.error('❌ Error fetching Bybit balances:', error.response?.data || error.message);
      // Return mock data on error
      return Promise.reject(error);
    }
  }

  async placeOrder(symbol: string, side: 'BUY' | 'SELL', quantity: number) {
    const entrySide = side.toLowerCase();
    const exitSide = side === 'BUY' ? 'sell' : 'buy';
    const absQty = Math.abs(quantity);
  
    // ---- 1. ENTRY ORDER ----
    const entryOrder = await this.exchange.createOrder(
      symbol,
      'market',
      entrySide,
      absQty
    );
  
    // ---- 2. TRY TO GET FILLED PRICE ----
    let filled;
    try {
      filled = await this.exchange.fetchOrder(entryOrder.id, symbol, {
        acknowledged: true
      });
    } catch {
      const closed = await this.exchange.fetchClosedOrders(symbol);
      filled = closed.find(o => o.id === entryOrder.id);
    }
  
    const entryPrice = filled?.average;
    if (!entryPrice) throw new Error('Cannot determine filled price');
  
    // ---- 3. CALCULATE TP & SL ----
    const tpPercent = 0.015;
    const slPercent = 0.015;
  
    const takeProfitPrice =
      side === 'BUY' ? entryPrice * (1 + tpPercent) : entryPrice * (1 - tpPercent);
  
    const stopLossPrice =
      side === 'BUY' ? entryPrice * (1 - slPercent) : entryPrice * (1 + slPercent);
  
    // ---- 4. TRIGGER DIRECTIONS ----
    const tpTrigger = side === 'BUY' ? 'ascending' : 'descending';
    const slTrigger = side === 'BUY' ? 'descending' : 'ascending';
  
    // ---- 5. TP ORDER ----
    const tpOrder = await this.exchange.createOrder(
      symbol,
      'market',          // <-- must be "market" or "limit"
      exitSide,
      absQty,
      undefined,
      {
        reduceOnly: true,
        triggerPrice: takeProfitPrice,
        triggerDirection: tpTrigger,
      }
    );
  
    // ---- 6. SL ORDER ----
    const slOrder = await this.exchange.createOrder(
      symbol,
      'market',
      exitSide,
      absQty,
      undefined,
      {
        reduceOnly: true,
        triggerPrice: stopLossPrice,
        triggerDirection: slTrigger,
      }
    );
  
    return {
      entryOrder,
      entryPrice,
      takeProfitPrice,
      stopLossPrice,
      tpOrder,
      slOrder
    };
  }
  
  

  async closePosition(symbol: string, position: any): Promise<boolean> {
    try {
      const { side, amount } = getCloseOrderParams(position[0]);
      symbol = `${formatPair(symbol)}:USDT`;
      const order = await this.exchange.createOrder(symbol, 'market', side, amount, undefined, {
        reduceOnly: true,
      });
      return order;

    } catch (error) {
      this.logger.error(`Failed to close position for ${symbol}:`, error.message);
      return false;
    }

  }

  async getPosition(symbol: string): Promise<PositionInfo[]> {
    try {
      symbol = `${formatPair(symbol)}:USDT`;
      const positions = await this.exchange.fetchPositions([symbol]);
      return positions.map((p: any) => ({
        symbol: p.symbol,
        positionAmt: parseFloat(p.info.positionAmt),    // Số lượng vị thế
        entryPrice: parseFloat(p.info.entryPrice),      // Giá vào lệnh
        unrealizedPnl: parseFloat(p.info.unRealizedProfit), // Lợi nhuận chưa thực hiện
        volume: parseFloat(p.info.notional),           // Giá trị vị thế
        marginType: p.info.marginType,                 // Loại margin (isolated/cross)
        USDValue: parseFloat(p.info.initialMargin),   // Số margin đã dùng
        side: parseFloat(p.info.positionAmt) > 0 ? 'long' : (parseFloat(p.info.positionAmt) < 0 ? 'short' : 'none'),
      }));
    } catch (error) {
      this.logger.error(`Failed to fetch positions for ${symbol}:`, error.message);
      return [];
    }
  }

  async getFundingHistory(symbol: string, limit = 1): Promise<any[]> {
    symbol = `${formatPair(symbol)}:USDT`;
    const history = await this.exchange.fetchFundingHistory(symbol, undefined, limit);
    return history;
  }
  async setUpBeforeRuns(
    symbol: string,
    initialMargin: number,
    leverage?: number,
    marginMode: 'cross' | 'isolated' = 'isolated'
  ) {
    symbol = `${formatPair(symbol)}:USDT`;
    await this.exchange.loadTimeDifference();

    const currentLeverage = await this.exchange.fetchLeverage(symbol);
    if (leverage != currentLeverage.info.info.leverage) {
      await this.exchange.setLeverage(leverage, symbol);
    }

    await this.exchange.setMarginMode(marginMode, symbol);
    const ticker = await this.exchange.fetchTicker(symbol);
    const quantity = calculateCoinAmountFromMargin(initialMargin, ticker.last, leverage || 1);

    return {
      symbol,
      quantity
    };
  }
  async fetchPosition(symbol: string): Promise<any> {
    symbol = `${formatPair(symbol)}:USDT`;
    const positions = await this.exchange.fetchPositions([symbol]);
    return positions;
  }

  async fecthCloseOrder(orderId: string, symbol: string): Promise<any> {
    const closedOrders = await this.exchange.fetchOrderTrades(orderId, symbol);
    return closedOrders;
  }

  async  monitorAndCloseFull(
    symbol: string,
    sl: number,  // stop-loss % (5 = -5%)
    tp: number   // take-profit % (5 = +5%)
  ) {
    symbol = `${formatPair(symbol)}:USDT`;
    while (true) {
      const orderbook = await this.exchange.fetchOrderBook(symbol);
      const askPrice = orderbook.asks[0][0];
      const bidPrice = orderbook.bids[0][0];
  
      // lấy position
      const positions = await this.exchange.fetchPositions([symbol]);
  
      if (!positions.length) {
        console.log("Không còn position → stop.");
        break;
      }
  
      const pos = positions[0];
  
      const roe = pos.info.unrealisedRoePcnt;  // ví dụ 0.012 = 1.2%
      const roePercent = roe * 100;
      const positionSize = Number(pos.contracts ?? pos.info.size ?? pos.size);
  
      if (!positionSize || positionSize === 0) {
        console.log("Pos size = 0 → exit.");
        break;
      }
  
      const absQty = Math.abs(positionSize);
  
      console.log(`ROE: ${roePercent}%, Size: ${absQty}`);
  
      // determine side to close
      const isLong = positionSize > 0;
      const closeSide = isLong ? "sell" : "buy";
      const closePrice = isLong ? bidPrice : askPrice;
  
      // ---- SL ----
      if (roePercent <= -sl) {
        console.log("SL HIT → closing FULL position...");
        await this.exchange.createOrder(symbol, "limit", closeSide, absQty, closePrice);
        break;
      }
  
      // ---- TP ----
      if (roePercent >= tp) {
        console.log("TP HIT → closing FULL position...");
        await this.exchange.createOrder(symbol, "limit", closeSide, absQty, closePrice);
        break;
      }
  
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}