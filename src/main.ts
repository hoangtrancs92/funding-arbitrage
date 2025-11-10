import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Enable CORS for development
    app.enableCors();

    // Enable global validation pipe for DTO validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: true, // Throw error if non-whitelisted properties exist
        transform: true, // Automatically transform payloads to DTO instances
        transformOptions: {
          enableImplicitConversion: true, // Convert string numbers to actual numbers
        },
      }),
    );

    // Setup Swagger API documentation
    const config = new DocumentBuilder()
      .setTitle('Funding Rate Arbitrage Bot API')
      .setDescription(
        'API for managing funding rate arbitrage trading bot across multiple exchanges',
      )
      .setVersion('1.0')
      .addTag('auto-trade', 'Automatic trading operations')
      .addTag('funding-rate', 'Funding rate and arbitrage opportunities')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    // Serve static files
    app.useStaticAssets(join(__dirname, '..', 'src/public'));

    const port = process.env.PORT || 3000;
    await app.listen(port);

    logger.log(`🚀 Funding Rate Arbitrage Bot is running on port ${port}`);
    logger.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`📚 API Documentation available at http://localhost:${port}/api`);
  } catch (error) {
    logger.error('❌ Failed to start application', error);
    process.exit(1);
  }
}

bootstrap();
