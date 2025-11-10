import crypto from 'crypto';

/**
 * Utility class for exchange API authentication
 */
export class ExchangeAuthUtils {
  private static serverTimeOffset = 0; // Offset between server time and local time

  /**
   * Get synchronized timestamp for exchange requests
   * Subtracts 1 second buffer to prevent "ahead of server time" errors
   * @returns Synchronized timestamp in milliseconds
   */
  public static getSyncedTimestamp(): number {
    const localTime = Date.now();
    const syncedTime = localTime + this.serverTimeOffset;
    // Subtract 1000ms (1 second) buffer to prevent timing issues
    return syncedTime - 1000;
  }

  /**
   * Update server time offset based on server response
   * @param serverTime - Server timestamp from exchange
   */
  static updateServerTimeOffset(serverTime: number): void {
    const localTime = Date.now();
    this.serverTimeOffset = serverTime - localTime;
  }

  /**
   * Create HMAC SHA256 signature for API requests
   * Note: This is NOT password hashing - it's HMAC signing for API authentication.
   * HMAC-SHA256 is the industry standard for exchange API request signing.
   * @param secretKey - The secret key for signing
   * @param query - The query string to sign
   * @returns The hex signature
   */
  static createSignature(secretKey: string, query: string): string {
    // CodeQL: This is HMAC signing, not password hashing - HMAC-SHA256 is appropriate here
    return crypto.createHmac('sha256', secretKey).update(query).digest('hex');
  }

  /**
   * Create query string with timestamp and signature for Binance
   * @param secretKey - Binance secret key
   * @param params - Additional parameters
   * @returns Object with query string and signature
   */
  static createBinanceSignedQuery(
    secretKey: string,
    params: Record<string, any> = {},
  ): {
    query: string;
    signature: string;
    fullQuery: string;
  } {
    const timestamp = this.getSyncedTimestamp();

    // Create query string manually to ensure proper order
    const queryParts: string[] = [];

    // Add all params first, then timestamp last
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        queryParts.push(
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
        );
      }
    }

    // Add timestamp at the end
    queryParts.push(`timestamp=${timestamp}`);

    const query = queryParts.join('&');
    const signature = this.createSignature(secretKey, query);
    const fullQuery = `${query}&signature=${signature}`;

    return {
      query,
      signature,
      fullQuery,
    };
  }

  /**
   * Create query string with timestamp and signature for Bybit V5 API
   * @param apiKey - Bybit API key
   * @param secretKey - Bybit secret key
   * @param params - Additional parameters
   * @returns Object with query string, signature, and headers
   */
  static createBybitSignedQuery(
    apiKey: string,
    secretKey: string,
    params: Record<string, any> = {},
  ): {
    query: string;
    signature: string;
    headers: Record<string, string>;
    timestamp: number;
  } {
    const timestamp = this.getSyncedTimestamp();
    const recv_window = '5000';

    // For Bybit V5, we don't include api_key in query params
    const queryParams = new URLSearchParams({
      timestamp: timestamp.toString(),
      recv_window,
      ...params,
    });

    const query = queryParams.toString();

    // Bybit V5 signature format: timestamp + api_key + recv_window + queryString
    const signaturePayload = timestamp + apiKey + recv_window + query;
    const signature = this.createSignature(secretKey, signaturePayload);

    return {
      query,
      signature,
      headers: {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature,
        'X-BAPI-TIMESTAMP': timestamp.toString(),
        'X-BAPI-RECV-WINDOW': recv_window,
        'Content-Type': 'application/json',
      },
      timestamp,
    };
  }

  /**
   * Create headers for authenticated requests
   * @param apiKey - The API key
   * @param signature - The signature
   * @param timestamp - The timestamp
   * @param exchange - The exchange name ('binance' | 'bybit')
   * @returns Headers object
   */
  static createAuthHeaders(
    apiKey: string,
    signature?: string,
    timestamp?: number,
    exchange: 'binance' | 'bybit' = 'binance',
  ): Record<string, string> {
    if (exchange === 'binance') {
      return {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      };
    } else if (exchange === 'bybit') {
      return {
        'X-BAPI-API-KEY': apiKey,
        'X-BAPI-SIGN': signature || '',
        'X-BAPI-TIMESTAMP': timestamp?.toString() || Date.now().toString(),
        'X-BAPI-RECV-WINDOW': '5000',
        'Content-Type': 'application/json',
      };
    }

    return {};
  }

  /**
   * Validate API credentials
   * @param apiKey - The API key
   * @param secretKey - The secret key
   * @returns Validation result
   */
  static validateCredentials(
    apiKey: string,
    secretKey: string,
  ): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!apiKey || apiKey.trim() === '') {
      errors.push('API key is required');
    }

    if (!secretKey || secretKey.trim() === '') {
      errors.push('Secret key is required');
    }

    if (apiKey && apiKey.length < 10) {
      errors.push('API key appears to be too short');
    }

    if (secretKey && secretKey.length < 10) {
      errors.push('Secret key appears to be too short');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
