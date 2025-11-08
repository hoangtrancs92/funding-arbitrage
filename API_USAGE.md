# API Usage Guide

## Order Management Endpoints

### 1. Test Market Order
**Endpoint:** `POST /test/binance/order/market`

**Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "initialMargin": 7,
  "leverage": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "123456789",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "MARKET",
    "quantity": 0.001,
    "status": "FILLED",
    "executedQty": 0.001,
    "executedPrice": 43250.50,
    "timestamp": 1699459200000
  },
  "message": "Market order placed successfully: 123456789"
}
```

### 2. Test Limit Order
**Endpoint:** `POST /test/binance/order/limit`

**Body:**
```json
{
  "symbol": "BTCUSDT",
  "side": "BUY",
  "initialMargin": 7,
  "price": 42000.00,
  "timeInForce": "GTC",
  "leverage": 2
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "orderId": "123456790",
    "symbol": "BTCUSDT",
    "side": "BUY",
    "type": "LIMIT",
    "quantity": 0.001,
    "price": 42000.00,
    "status": "NEW",
    "executedQty": 0,
    "timestamp": 1699459200000
  },
  "message": "Limit order placed successfully: 123456790"
}
```

## Direct Binance Connector Methods

### 1. Place Order
```typescript
const orderResult = await binanceConnector.placeOrder(
  'BTCUSDT',     // symbol
  'BUY',         // side
  'MARKET',      // type
  7,             // initialMargin (USDT)
  undefined,     // price (not needed for market orders)
  undefined,     // timeInForce (not needed for market orders)
  2              // leverage (optional, will use account default if not provided)
);
```

### 2. Cancel Order
```typescript
const success = await binanceConnector.cancelOrder('BTCUSDT', '123456789');
```

### 3. Get Order Status
```typescript
const order = await binanceConnector.getOrder('BTCUSDT', '123456789');
```

## Order Status Mapping

| Binance Status | Our Status | Description |
|----------------|------------|-------------|
| NEW | NEW | Order has been placed |
| PARTIALLY_FILLED | PARTIALLY_FILLED | Order partially executed |
| FILLED | FILLED | Order fully executed |
| CANCELED | CANCELED | Order canceled |
| REJECTED | REJECTED | Order rejected |
| EXPIRED | CANCELED | Order expired (mapped to canceled) |

## Error Handling

All methods include comprehensive error handling:
- **API credential validation** before making requests
- **Binance-specific error codes** with meaningful messages
- **Network error handling** with retry suggestions
- **Parameter validation** to prevent invalid requests

## Security Features

- **HMAC SHA256 signatures** for all authenticated requests
- **Timestamp validation** to prevent replay attacks
- **API key masking** in logs for security
- **Credential validation** before any API calls

## Margin-Based Order Calculation

The `placeOrder` method now uses **Initial Margin** instead of quantity:

### Example Calculation:
```
Initial Margin: 7 USDT
Leverage: 2x
Current BTC Price: $43,000

Position Value = Initial Margin × Leverage = 7 × 2 = 14 USDT
Quantity = Position Value ÷ Price = 14 ÷ 43,000 = 0.000325 BTC
```

### Benefits:
- **Risk Management**: Control exact risk amount in USDT
- **Cross-Exchange Consistency**: Same risk amount across Binance/Bybit
- **Leverage Flexibility**: Automatically adapts to account leverage settings
- **Easy Calculation**: No need to manually calculate quantities

## Testing Notes

⚠️ **IMPORTANT**: These are real trading endpoints that will place actual orders on Binance/Bybit Futures!

For testing purposes:
1. Use small margin amounts (1-5 USDT for testing)
2. Consider using limit orders with far-from-market prices for testing
3. Always cancel test orders immediately after placement
4. Monitor your account balance and positions
5. Verify leverage settings before placing orders

## Next Steps

The order placement functionality is now fully implemented and ready for integration with:
- ✅ Advanced Arbitrage Strategy
- ✅ Risk Management System
- ✅ Position Monitoring
- ✅ Automated Trading Signals