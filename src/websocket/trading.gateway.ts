import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { FundingRateService } from '../data/funding-rate.service';
import { ArbitrageDetector } from '../arbitrage/arbitrage-detector.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TradingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TradingGateway.name);
  private clients: Set<Socket> = new Set();

  constructor(
    private fundingRateService: FundingRateService,
    private arbitrageDetector: ArbitrageDetector,
  ) {}

  handleConnection(client: Socket) {
    this.clients.add(client);
    this.logger.log(`Client connected: ${client.id}`);

    // Send initial data
    this.sendInitialData(client);
  }

  handleDisconnect(client: Socket) {
    this.clients.delete(client);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  private async sendInitialData(client: Socket) {
    try {
      // Send current funding rates
      const fundingRates = await this.fundingRateService.collectFundingRates([
        'BTCUSDT',
        'ETHUSDT',
        'ADAUSDT',
        'SOLUSDT',
        'XRPUSDT',
      ]);

      client.emit('funding-rates', Array.from(fundingRates.entries()));

      // Send current opportunities
      const opportunities =
        this.arbitrageDetector.detectOpportunities(fundingRates);
      client.emit('opportunities', opportunities);
    } catch (error) {
      this.logger.error('Error sending initial data', error);
    }
  }

  // Method để broadcast funding rates update
  async broadcastFundingRatesUpdate(symbols: string[]) {
    try {
      const fundingRates =
        await this.fundingRateService.collectFundingRates(symbols);
      this.server.emit('funding-rates', Array.from(fundingRates.entries()));
    } catch (error) {
      this.logger.error('Error broadcasting funding rates', error);
    }
  }

  // Method để broadcast opportunities update
  async broadcastOpportunitiesUpdate(symbols: string[]) {
    try {
      const fundingRates =
        await this.fundingRateService.collectFundingRates(symbols);
      const opportunities =
        this.arbitrageDetector.detectOpportunities(fundingRates);
      this.server.emit('opportunities', opportunities);
    } catch (error) {
      this.logger.error('Error broadcasting opportunities', error);
    }
  }

  // Method để broadcast bot status
  broadcastBotStatus(status: any) {
    this.server.emit('bot-status', status);
  }

  // Method để broadcast positions update
  broadcastPositionsUpdate(positions: any[]) {
    this.server.emit('positions-update', positions);
  }

  // Method để broadcast profit update
  broadcastProfitUpdate(profitData: any) {
    this.server.emit('profit-update', profitData);
  }

  @SubscribeMessage('subscribe-symbol')
  handleSubscribeSymbol(
    @MessageBody() symbol: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} subscribed to ${symbol}`);

    // Add client to symbol-specific room
    client.join(`symbol:${symbol}`);

    // Send current data for this symbol
    this.sendSymbolData(client, symbol);
  }

  @SubscribeMessage('unsubscribe-symbol')
  handleUnsubscribeSymbol(
    @MessageBody() symbol: string,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`Client ${client.id} unsubscribed from ${symbol}`);
    client.leave(`symbol:${symbol}`);
  }

  private async sendSymbolData(client: Socket, symbol: string) {
    try {
      const fundingRates = await this.fundingRateService.collectFundingRates([
        symbol,
      ]);
      const opportunities =
        this.arbitrageDetector.detectOpportunities(fundingRates);

      client.emit('symbol-data', {
        symbol,
        fundingRates: Array.from(fundingRates.entries()),
        opportunities,
        timestamp: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error sending symbol data for ${symbol}`, error);
    }
  }

  // Broadcast to specific symbol subscribers
  broadcastToSymbol(symbol: string, event: string, data: any) {
    this.server.to(`symbol:${symbol}`).emit(event, data);
  }
}
