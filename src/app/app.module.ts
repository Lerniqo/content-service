/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable prettier/prettier */
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppService } from './app.service';
import { AppController } from './app.controller';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from '../health/health.module';
import { Neo4jModule } from '../common/neo4j/neo4j.module';
import { KafkaModule } from '../common/kafka/kafka.module';
import { ResourcesModule } from '../resources/resources.module';
import { QuestionsModule } from '../questions/questions.module';
import { QuizzesModule } from '../quizzes/quizzes.module';
import { SyllabusModule } from '../syllabus/syllabus.module';
import { ConceptsModule } from '../concepts/concepts.module';
import { LearningPathModule } from '../learning-path/learning-path.module';
import { ContestsModule } from '../contests/contests.module';
import { ProgressServiceClientModule } from '../common/clients/progress-service-client.module';
import { AuthMiddleware } from '../common/middleware/auth.middleware';

@Module({
    imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env',
    }),
    LoggerModule.forRoot({
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
    }),
    HealthModule,
    Neo4jModule,
    KafkaModule.forRootAsync(),
    ResourcesModule,
    QuestionsModule,
    QuizzesModule,
    SyllabusModule,
    ConceptsModule,
    LearningPathModule,
    ContestsModule,
    ProgressServiceClientModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .exclude('syllabus', 'concepts/*path')
      .forRoutes('*');
  }
}
