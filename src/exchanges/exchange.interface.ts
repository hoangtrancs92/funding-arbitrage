export interface FuturesContract {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  contractSize: number;
  tickSize: number;
  minOrderSize: number;
  status: 'TRADING' | 'SUSPENDED' | 'DELISTED';
}

export interface FundingRate {
  symbol: string;
  fundingRate: number;
  fundingTime: number;
  nextFundingTime: number;
  predictedFundingRate?: number;
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: number;
}

export interface Balance {
  asset: string;
  free: number;
  locked: number;
  total: number;
}

export interface Position {
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  percentage: number;
  marginType: 'CROSS' | 'ISOLATED';
}

export interface OrderResult {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'STOP_LIMIT';
  quantity: number;
  price?: number;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED';
  executedQty: number;
  executedPrice?: number;
  timestamp: number;
}

export abstract class ExchangeConnector {
  abstract exchangeName: string;
  
  // Market Data Methods
  abstract getFuturesContracts(): Promise<FuturesContract[]>;
  abstract getFundingRates(symbols?: string[]): Promise<FundingRate[]>;
  abstract getOrderBook(symbol: string, limit?: number): Promise<OrderBook>;
  abstract getMarkPrice(symbol: string): Promise<number>;
  
  // Account Methods
  abstract getBalances(): Promise<Balance[]>;
  abstract getPositions(): Promise<Position[]>;
  
  // Trading Methods
  abstract placeOrder(
    symbol: string,
    side: 'BUY' | 'SELL',
    type: 'MARKET' | 'LIMIT',
    quantity: number,
    price?: number,
    timeInForce?: 'GTC' | 'IOC' | 'FOK'
  ): Promise<OrderResult>;
  
  abstract cancelOrder(symbol: string, orderId: string): Promise<boolean>;
  abstract getOrder(symbol: string, orderId: string): Promise<OrderResult>;
  
  // WebSocket Methods
  abstract subscribeToFundingRates(symbols: string[], callback: (data: FundingRate) => void): void;
  abstract subscribeToOrderBook(symbols: string[], callback: (data: OrderBook) => void): void;
  abstract subscribeToUserData(callback: (data: any) => void): void;
}