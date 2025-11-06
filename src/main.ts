import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    
    // Enable CORS for development
    app.enableCors();
    
    // Serve static files
    app.useStaticAssets(join(__dirname, '..', 'src/public'));
    
    const port = process.env.PORT || 3000;
    await app.listen(port);
    
    logger.log(`🚀 Funding Rate Arbitrage Bot is running on port ${port}`);
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
  } catch (error) {
    logger.error('❌ Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
