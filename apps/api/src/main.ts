import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ConfigService } from '@nestjs/config';
import { startObservability, stopObservability } from './observability';
import { createRequestLogger } from './observability/request-logger';

async function bootstrap() {
  await startObservability();

  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Enable CORS for frontend
  app.enableCors({
    origin: configService.get('FRONTEND_URL', 'http://localhost:4200'),
    credentials: true,
  });

  // Enable cookie parser
  app.use(cookieParser());

  // Request logging (method/url/status/latency) with trace correlation
  app.use(createRequestLogger());

  const port = configService.get('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 API is running on: http://localhost:${port}`);
}

bootstrap();

// Graceful shutdown for OpenTelemetry exporter buffers
process.on('SIGINT', async () => {
  await stopObservability();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await stopObservability();
  process.exit(0);
});
