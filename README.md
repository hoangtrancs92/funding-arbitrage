# Funding Rate Arbitrage Bot

This is a NestJS-based bot for detecting and executing funding rate arbitrage opportunities across multiple cryptocurrency exchanges.

## Features

- **Multi-Exchange Support**: Binance, Bybit, OKX futures markets
- **Real-time Monitoring**: Continuous funding rate monitoring and arbitrage detection
- **Risk Management**: Comprehensive risk controls and position management
- **Strategy Engine**: Configurable trading strategies with performance tracking
- **Monitoring & Alerts**: Real-time alerts and performance monitoring
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Input Validation**: Comprehensive validation of all user inputs

## Description

Advanced funding rate arbitrage bot built with [Nest](https://github.com/nestjs/nest) framework TypeScript.

## Prerequisites

- Node.js 18+ or higher
- npm or yarn package manager
- API keys from supported exchanges (Binance, Bybit, OKX)
- Basic understanding of cryptocurrency futures trading

## Project setup

```bash
# Install dependencies
$ npm install

# Copy environment configuration
$ cp .env.example .env

# Edit .env file with your API keys
$ nano .env  # or use your preferred editor
```

## Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Binance API Configuration
BINANCE_API_KEY=your_binance_api_key_here
BINANCE_SECRET_KEY=your_binance_secret_key_here
BINANCE_TESTNET=true

# Bybit API Configuration
BYBIT_API_KEY=your_bybit_api_key_here
BYBIT_SECRET_KEY=your_bybit_secret_key_here
BYBIT_TESTNET=true

# OKX API Configuration (Optional - not fully implemented)
OKX_API_KEY=your_okx_api_key_here
OKX_SECRET_KEY=your_okx_secret_key_here
OKX_PASSPHRASE=your_okx_passphrase_here

# Trading Configuration
DEFAULT_SYMBOLS=BTCUSDT,ETHUSDT,ADAUSDT,BNBUSDT,SOLUSDT
MONITORING_INTERVAL=5
MAX_CONCURRENT_TRADES=10

# Risk Management
MAX_DAILY_LOSS=1000
MAX_PORTFOLIO_RISK=0.05
MAX_LEVERAGE=10
```

**Important Security Notes:**
- Never commit your `.env` file to version control
- Use testnet API keys for development and testing
- Ensure API keys have appropriate permissions (read + trade)
- Consider using API key IP whitelisting on exchanges

## Compile and run the project

```bash
# development
$ npm run start

# watch mode (recommended for development)
$ npm run start:dev

# production mode
$ npm run start:prod
```

## API Documentation

Once the application is running, access the interactive API documentation at:

```
http://localhost:3000/api
```

This provides a complete reference of all available endpoints with the ability to test them directly.

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
