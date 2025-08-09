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
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
            levelFirst: true,
            singleLine: false,
            messageFormat: '{req.method} {req.url} {res.statusCode} - {msg}',
          },
        },
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        autoLogging: true, // logs every request automatically
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
