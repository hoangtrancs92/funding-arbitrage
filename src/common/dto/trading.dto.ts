import { IsString, IsNumber, IsOptional, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PlaceOrderDto {
  @ApiProperty({
    description: 'Trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
  })
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Exchange name',
    example: 'Binance',
    enum: ['Binance', 'Bybit', 'OKX'],
  })
  @IsString()
  @IsIn(['Binance', 'Bybit', 'OKX'])
  exchange: string;

  @ApiProperty({
    description: 'Order side',
    example: 'BUY',
    enum: ['BUY', 'SELL'],
  })
  @IsString()
  @IsIn(['BUY', 'SELL'])
  side: 'BUY' | 'SELL';

  @ApiProperty({
    description: 'Initial margin in USD',
    example: 100,
    minimum: 10,
    maximum: 100000,
  })
  @IsNumber()
  @Min(10)
  @Max(100000)
  initialMargin: number;

  @ApiPropertyOptional({
    description: 'Leverage (1-125)',
    example: 10,
    minimum: 1,
    maximum: 125,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(125)
  leverage?: number;

  @ApiPropertyOptional({
    description: 'Margin mode',
    example: 'isolated',
    enum: ['cross', 'isolated'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['cross', 'isolated'])
  marginMode?: 'cross' | 'isolated';
}

export class UpdateRiskParametersDto {
  @ApiPropertyOptional({
    description: 'Maximum leverage allowed',
    example: 10,
    minimum: 1,
    maximum: 125,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(125)
  maxLeverage?: number;

  @ApiPropertyOptional({
    description: 'Maximum position size in USD',
    example: 100000,
    minimum: 100,
    maximum: 1000000,
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(1000000)
  maxPositionSize?: number;

  @ApiPropertyOptional({
    description: 'Maximum portfolio risk (0-1)',
    example: 0.05,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxPortfolioRisk?: number;

  @ApiPropertyOptional({
    description: 'Maximum daily loss in USD',
    example: 5000,
    minimum: 0,
    maximum: 100000,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  maxDailyLoss?: number;

  @ApiPropertyOptional({
    description: 'Stop loss percentage (0-1)',
    example: 0.02,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  stopLossPercentage?: number;
}
