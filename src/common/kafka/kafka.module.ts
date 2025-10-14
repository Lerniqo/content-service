import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KafkaService } from './kafka.service';
import { KafkaConfig } from './interfaces/kafka-config.interface';
import { ContentEventProducer } from './producers/content-event.producer';
import { StudentProgressEventConsumer } from './consumers/student-progress-event.consumer';
import { UpdateMasteryConsumer } from './consumers/update-mastery.consumer';

@Global()
@Module({})
export class KafkaModule {
  static forRootAsync(): DynamicModule {
    return {
      module: KafkaModule,
      imports: [],
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
              connectionTimeout: configService.get<number>(
                'KAFKA_CONNECTION_TIMEOUT',
                3000,
              ),
              requestTimeout: configService.get<number>(
                'KAFKA_REQUEST_TIMEOUT',
                30000,
              ),
              retry: {
                initialRetryTime: configService.get<number>(
                  'KAFKA_INITIAL_RETRY_TIME',
                  100,
                ),
                retries: configService.get<number>('KAFKA_RETRIES', 8),
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
