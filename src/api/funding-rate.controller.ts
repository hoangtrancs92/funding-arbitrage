import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { FundingRateService } from '../data/funding-rate.service';

@Controller('funding-rates')
export class FundingRateController {
  constructor(private readonly fundingRateService: FundingRateService) {}

  @Get()
  async getAllFundingRates(@Query('symbols') symbols?: string) {
    const symbolArray = symbols ? symbols.split(',') : undefined;
    const result =
      await this.fundingRateService.collectFundingRates(symbolArray);
    const entries = [...result.entries()];
    return entries;
  }

  @Get(':symbol')
  async getSymbolFundingRates(@Param('symbol') symbol: string) {
    return await this.fundingRateService.getSymbolFundingRates(symbol);
  }

  @Get('opportunities/top')
  async getTopOpportunities(@Query('limit') limit?: number) {
    return await this.fundingRateService.getTopOpportunities(
      limit ? parseInt(limit.toString()) : 10,
    );
  }

  @Post('monitoring/start')
  async startMonitoring(@Query('interval') interval?: number) {
    await this.fundingRateService.startMonitoring(
      interval ? parseInt(interval.toString()) : 5,
    );
    return { message: 'Monitoring started', interval: interval || 5 };
  }
}
