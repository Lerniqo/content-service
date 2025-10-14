import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { KafkaConfig } from './interfaces/kafka-config.interface';
import { ContentEventProducer } from './producers/content-event.producer';
import { StudentProgressEventConsumer } from './consumers/student-progress-event.consumer';
import { UpdateMasteryConsumer } from './consumers/update-mastery.consumer';
import { Neo4jModule } from '../neo4j/neo4j.module';

@Global()
@Module({})
export class KafkaModule {
  static forRootAsync(): DynamicModule {
    return {
      module: KafkaModule,
      imports: [Neo4jModule],
      providers: [
        {
          provide: 'KAFKA_CONFIG',
          useFactory: (configService: ConfigService): KafkaConfig => {
            const brokers = configService
              .get<string>('KAFKA_BROKERS', 'localhost:9092')
              .split(',');

            return {
              clientId: configService.get<string>(
                'KAFKA_CLIENT_ID',
                'content-service',
              ),
              brokers,
              connectionTimeout: parseInt(
                configService.get<string>('KAFKA_CONNECTION_TIMEOUT', '3000'),
                10,
              ),
              requestTimeout: parseInt(
                configService.get<string>('KAFKA_REQUEST_TIMEOUT', '30000'),
                10,
              ),
              retry: {
                initialRetryTime: parseInt(
                  configService.get<string>('KAFKA_INITIAL_RETRY_TIME', '100'),
                  10,
                ),
                retries: parseInt(
                  configService.get<string>('KAFKA_RETRIES', '8'),
                  10,
                ),
              },
              ssl: configService.get<boolean>('KAFKA_SSL', false),
              // Optional SASL configuration for production
              sasl: configService.get<string>('KAFKA_SASL_USERNAME')
                ? {
                    mechanism: 'plain' as const,
                    username: configService.get<string>('KAFKA_SASL_USERNAME')!,
                    password: configService.get<string>('KAFKA_SASL_PASSWORD')!,
                  }
                : undefined,
            };
          },
          inject: [ConfigService],
        },
        KafkaService,
        ContentEventProducer,
        StudentProgressEventConsumer,
        UpdateMasteryConsumer,
      ],
      exports: [KafkaService, ContentEventProducer],
      global: true,
    };
  }
}
