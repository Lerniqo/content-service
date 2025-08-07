import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs : true
  });
  // app.useLogger(app.get(Logger))
  
  // Get PinoLogger instance and create the filter with it

  const pinoLogger = await app.resolve(PinoLogger);

  app.useGlobalFilters(new HttpExceptionFilter(pinoLogger));
  
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
