import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from '../health/health.module';
import { Neo4jModule } from '../common/neo4j/neo4j.module';
import { ConceptsModule } from '../concepts/concepts.module';
import { MockAuthMiddleware } from '../common/middleware/mock-auth.middleware';

@Module({
    imports: [LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV === 'production' ? undefined : {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname,req,res',
            levelFirst: true,
            singleLine: true,
            messageFormat: '{msg}',
          },
        },
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        autoLogging: {
          ignore: (req: any) => {
            // Skip logging health check requests to reduce noise
            return req.url === '/health' || req.url === '/health/readiness' || req.url === '/health/liveness';
          }
        },
        customReceivedMessage: (req: any) => `→ ${req.method} ${req.url}`,
        customSuccessMessage: (req: any, res: any) => {
          const status = res.statusCode >= 400 ? '❌' : '✅';
          return `${status} ${req.method} ${req.url} → ${res.statusCode} (${res.responseTime}ms)`;
        },
        customErrorMessage: (req: any, res: any) => `❌ ${req.method} ${req.url} → ${res.statusCode}`,
      },
    }), HealthModule, Neo4jModule, ConceptsModule],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MockAuthMiddleware)
      .forRoutes('*');
  }
}
