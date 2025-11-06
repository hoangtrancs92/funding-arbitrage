import { Injectable } from '@nestjs/common';

export interface AppConfig {
  port: number;
  environment: string;
  logLevel: string;
  
  // Exchange API configurations
  exchanges: {
    binance: {
      apiKey: string;
      secretKey: string;
      testnet: boolean;
    };
    bybit: {
      apiKey: string;
      secretKey: string;
      testnet: boolean;
    };
    okx: {
      apiKey: string;
      secretKey: string;
      passphrase: string;
      testnet: boolean;
    };
  };
  
  // Trading configurations
  trading: {
    defaultSymbols: string[];
    monitoringInterval: number; // minutes
    maxConcurrentTrades: number;
    emergencyStopLoss: number; // percentage
  };
  
  // Risk management
  risk: {
    maxDailyLoss: number;
    maxPortfolioRisk: number;
    maxLeverage: number;
  };
  
  // Notifications
  notifications: {
    telegram?: {
      botToken: string;
      chatId: string;
    };
    discord?: {
      webhookUrl: string;
    };
    email?: {
      smtp: {
        host: string;
        port: number;
        user: string;
        pass: string;
      };
      to: string[];
    };
  };
}

@Injectable()
export class ConfigService {
  private config: AppConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  private loadConfig(): AppConfig {
    return {
      port: parseInt(process.env.PORT || '3000'),
      environment: process.env.NODE_ENV || 'development',
      logLevel: process.env.LOG_LEVEL || 'info',
      
      exchanges: {
        binance: {
          apiKey: process.env.BINANCE_API_KEY || '',
          secretKey: process.env.BINANCE_SECRET_KEY || '',
          testnet: process.env.BINANCE_TESTNET === 'true',
        },
        bybit: {
          apiKey: process.env.BYBIT_API_KEY || '',
          secretKey: process.env.BYBIT_SECRET_KEY || '',
          testnet: process.env.BYBIT_TESTNET === 'true',
        },
        okx: {
          apiKey: process.env.OKX_API_KEY || '',
          secretKey: process.env.OKX_SECRET_KEY || '',
          passphrase: process.env.OKX_PASSPHRASE || '',
          testnet: process.env.OKX_TESTNET === 'true',
        },
      },
      
      trading: {
        defaultSymbols: (process.env.DEFAULT_SYMBOLS || 'BTCUSDT,ETHUSDT,ADAUSDT').split(','),
        monitoringInterval: parseInt(process.env.MONITORING_INTERVAL || '5'),
        maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES || '10'),
        emergencyStopLoss: parseFloat(process.env.EMERGENCY_STOP_LOSS || '0.05'),
      },
      
      risk: {
        maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS || '1000'),
        maxPortfolioRisk: parseFloat(process.env.MAX_PORTFOLIO_RISK || '0.05'),
        maxLeverage: parseFloat(process.env.MAX_LEVERAGE || '10'),
      },
      
      notifications: {
        telegram: process.env.TELEGRAM_BOT_TOKEN ? {
          botToken: process.env.TELEGRAM_BOT_TOKEN,
          chatId: process.env.TELEGRAM_CHAT_ID || '',
        } : undefined,
        
        discord: process.env.DISCORD_WEBHOOK_URL ? {
          webhookUrl: process.env.DISCORD_WEBHOOK_URL,
        } : undefined,
        
        email: process.env.SMTP_HOST ? {
          smtp: {
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
          },
          to: (process.env.EMAIL_TO || '').split(',').filter(Boolean),
        } : undefined,
      },
    };
  }
  
  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }
  
  getExchangeConfig(exchange: 'binance' | 'bybit' | 'okx') {
    return this.config.exchanges[exchange];
  }
  
  getTradingConfig() {
    return this.config.trading;
  }
  
  getRiskConfig() {
    return this.config.risk;
  }
  
  getNotificationConfig() {
    return this.config.notifications;
  }
}