import { PositionInfo } from '../exchange.interface';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mexc } from 'ccxt';
import { calculateCoinAmountFromMargin, formatPair, getCloseOrderParams } from 'src/common/helper';

@Injectable()
export class MexcConnector {
  exchangeName = 'mexc';

  private apiKey: string;
  private secretKey: string;
  private exchange: mexc;

  constructor(private readonly configService: ConfigService) {
    // Initialize with ConfigService để đảm bảo .env được load
    this.apiKey = this.configService.get<string>('BINANCE_API_KEY') || '';
    this.secretKey = this.configService.get<string>('BINANCE_SECRET_KEY') || '';
    this.exchange = new mexc({
      apiKey: this.apiKey,
      secret: this.secretKey,
      options: {
        defaultType: 'future',
      },
    });
    this.exchange.loadTimeDifference();
  }

  async getFuturesContracts() {
    return this.exchange.fetchMarkets;
  }

  async getFundingRates(symbols?: string[]) {
  }

  async getOrderBook(symbol: string, limit = 500){
  }

  async getMarkPrice(symbol: string) {
  }

  async getBalances() {

  }

  async placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    initialMargin: number,
    leverage?: number,
    marginMode: 'cross' | 'isolated' = 'isolated'
  ) {
    symbol = `${formatPair(symbol)}`;
    // Đồng bộ server time trước khi thực hiện
    await this.exchange.loadTimeDifference();

    await this.exchange.setLeverage(leverage, symbol);
    await this.exchange.setMarginMode(marginMode, symbol);
    const ticker = await this.exchange.fetchTicker(symbol);

    const quantity = calculateCoinAmountFromMargin(initialMargin, ticker.last, leverage || 1);
    const result = await this.exchange.createOrder(symbol, 'market', side.toLowerCase(), quantity);

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