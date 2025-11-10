import { BadRequestException } from '@nestjs/common';

/**
 * Utility class for input validation
 */
export class ValidationUtils {
  /**
   * Validate that a number is within a specified range
   * @param value - The value to validate
   * @param min - Minimum allowed value
   * @param max - Maximum allowed value
   * @param fieldName - Name of the field for error messages
   * @throws BadRequestException if validation fails
   */
  static validateNumberRange(
    value: number,
    min: number,
    max: number,
    fieldName: string,
  ): void {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new BadRequestException(`${fieldName} must be a valid number`);
    }

    if (value < min || value > max) {
      throw new BadRequestException(
        `${fieldName} must be between ${min} and ${max}`,
      );
    }
  }

  /**
   * Validate that a string is not empty
   * @param value - The value to validate
   * @param fieldName - Name of the field for error messages
   * @throws BadRequestException if validation fails
   */
  static validateNonEmptyString(value: string, fieldName: string): void {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new BadRequestException(`${fieldName} must be a non-empty string`);
    }
  }

  /**
   * Validate that a value is in a list of allowed values
   * @param value - The value to validate
   * @param allowedValues - Array of allowed values
   * @param fieldName - Name of the field for error messages
   * @throws BadRequestException if validation fails
   */
  static validateEnum<T>(
    value: T,
    allowedValues: T[],
    fieldName: string,
  ): void {
    if (!allowedValues.includes(value)) {
      throw new BadRequestException(
        `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      );
    }
  }

  /**
   * Validate trading symbol format
   * @param symbol - The symbol to validate
   * @throws BadRequestException if validation fails
   */
  static validateTradingSymbol(symbol: string): void {
    this.validateNonEmptyString(symbol, 'Symbol');

    // Symbol should be alphanumeric and contain common pairs
    const symbolPattern = /^[A-Z0-9]+$/;
    if (!symbolPattern.test(symbol)) {
      throw new BadRequestException(
        'Symbol must contain only uppercase letters and numbers',
      );
    }

    // Reasonable length check
    if (symbol.length < 3 || symbol.length > 20) {
      throw new BadRequestException(
        'Symbol length must be between 3 and 20 characters',
      );
    }
  }

  /**
   * Validate exchange name
   * @param exchange - The exchange name to validate
   * @throws BadRequestException if validation fails
   */
  static validateExchange(exchange: string): void {
    const allowedExchanges = ['Binance', 'Bybit', 'OKX'];
    this.validateEnum(exchange, allowedExchanges, 'Exchange');
  }

  /**
   * Validate position size for trading
   * @param size - The position size in USD
   * @throws BadRequestException if validation fails
   */
  static validatePositionSize(size: number): void {
    const minSize = 10; // Minimum $10
    const maxSize = 1000000; // Maximum $1M
    this.validateNumberRange(size, minSize, maxSize, 'Position size');
  }

  /**
   * Validate leverage
   * @param leverage - The leverage value
   * @throws BadRequestException if validation fails
   */
  static validateLeverage(leverage: number): void {
    const minLeverage = 1;
    const maxLeverage = 125;
    this.validateNumberRange(leverage, minLeverage, maxLeverage, 'Leverage');
  }
}
