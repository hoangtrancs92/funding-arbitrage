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
  orderId: string;       // Mã lệnh
  symbol: string;        // BTC/USDT
  side: any;  // Hướng vào lệnh
  type: any;

  quantity: number;      // Số lượng đặt
  filled: number;        // Khớp được bao nhiêu

  avgPrice?: number;     // Giá khớp trung bình (market order)
  timestamp: number;     // Thời điểm tạo lệnh (ms)
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
    initialMargin: number, // Số tiền margin ban đầu (USDT)
    leverage?: number, // Default sẽ lấy từ account settings
    marginType?: 'cross' | 'isolated' // Loại margin
  )
  
  abstract cancelOrder(symbol: string, orderId: string): Promise<boolean>;
  abstract getOrder(symbol: string, orderId: string);
}