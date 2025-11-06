import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return `
    🚀 Funding Rate Arbitrage Bot API
    
    📊 Available Endpoints:
    - GET /status - Bot status
    - GET /health - Health check
    - GET /funding-rates - All funding rates
    - GET /funding-rates/:symbol - Specific symbol rates
    - GET /funding-rates/opportunities/top - Top opportunities
    - POST /funding-rates/monitoring/start - Start monitoring
    
    📖 Documentation: Check README.md for setup instructions
    `;
  }
}
