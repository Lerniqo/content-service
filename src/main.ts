import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';
import { LoggerUtil } from './common/utils/logger.util';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  
  // Get PinoLogger instance and create the filter with it
  const pinoLogger = await app.resolve(PinoLogger);
  app.useGlobalFilters(new HttpExceptionFilter(pinoLogger));
  
  const port = process.env.PORT ?? 3000;
  
  // Log application startup
  LoggerUtil.logInfo(pinoLogger, 'Application', 'Starting Content Service', { 
    port, 
    environment: process.env.NODE_ENV || 'development' 
  });
  
  await app.listen(port);
  
  LoggerUtil.logInfo(pinoLogger, 'Application', 'Content Service started successfully', { 
    port, 
    url: `http://localhost:${port}` 
  });
}

bootstrap().catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
