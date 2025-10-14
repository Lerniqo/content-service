/* eslint-disable @typescript-eslint/no-unused-vars */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';
import { Logger, PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';
import { LoggerUtil } from './common/utils/logger.util';
//
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  // Get PinoLogger instance and create the filter with it
  const pinoLogger = await app.resolve(PinoLogger);
  app.useGlobalFilters(new HttpExceptionFilter(pinoLogger));

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', // Frontend development
      'http://localhost:4001', // Content service
      'https://main.ddwyki3l42m0e.amplifyapp.com', // Production frontend domain
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'x-user-id',
      'x-user-roles',
      'x-user-name',
    ],
    credentials: true, // Enable if you need to send cookies/auth headers
  });

  // Configure global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that are not in the DTO
      forbidNonWhitelisted: true, // Throw error if non-whitelisted properties are present
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // Automatically convert primitive types
      },
      validationError: {
        target: false, // Don't expose the target object in validation errors
        value: false, // Don't expose the value in validation errors
      },
    }),
  );

  const port = process.env.PORT ?? 4001;

  // Log application startup
  LoggerUtil.logInfo(pinoLogger, 'Application', 'Starting Content Service', {
    port,
    environment: process.env.NODE_ENV || 'development',
  });

  await app.listen(port);

  LoggerUtil.logInfo(
    pinoLogger,
    'Application',
    'Content Service started successfully',
    {
      port,
      url: `http://localhost:${port}`,
      endpoints: {
        resources: `http://localhost:${port}/resources`,
        health: `http://localhost:${port}/health`,
      },
    },
  );
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
