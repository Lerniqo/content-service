import {
  Injectable,
  Inject,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, Producer, Consumer, EachMessagePayload } from 'kafkajs';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import type {
  KafkaConfig,
  KafkaMessage,
  KafkaConsumerConfig,
} from './interfaces/kafka-config.interface';
import { LoggerUtil } from '../utils/logger.util';

export interface MessageHandler {
  (payload: EachMessagePayload): Promise<void>;
}

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumers: Map<string, Consumer> = new Map();
  private readonly context = 'KafkaService';

  constructor(
    @Inject('KAFKA_CONFIG') private readonly kafkaConfig: KafkaConfig,
    @InjectPinoLogger(KafkaService.name) private readonly logger: PinoLogger,
  ) {
    this.kafka = new Kafka(this.kafkaConfig);
    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.producer.connect();
      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Producer connected successfully',
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to connect producer',
        error,
      );
      
      // In development mode, just log the error instead of throwing
      if (process.env.NODE_ENV === 'development') {
        LoggerUtil.logInfo(
          this.logger,
          this.context,
          'Continuing without Kafka in development mode',
        );
        return;
      }
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      // Disconnect all consumers
      for (const [groupId, consumer] of this.consumers.entries()) {
        await consumer.disconnect();
        LoggerUtil.logInfo(this.logger, this.context, `Consumer disconnected`, {
          groupId,
        });
      }
      this.consumers.clear();

      // Disconnect producer
      await this.producer.disconnect();
      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Producer disconnected successfully',
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Error during cleanup',
        error,
      );
    }
  }

  /**
   * Send a single message to Kafka
   */
  async sendMessage(message: KafkaMessage): Promise<void> {
    try {
      const kafkaMessage = {
        key: message.key ? Buffer.from(message.key) : null,
        value:
          typeof message.value === 'string'
            ? Buffer.from(message.value)
            : message.value,
        headers: message.headers,
        timestamp: message.timestamp,
      };

      await this.producer.send({
        topic: message.topic,
        messages: [kafkaMessage],
      });

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Message sent successfully',
        {
          topic: message.topic,
          key: message.key,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to send message',
        error,
      );
      throw error;
    }
  }

  /**
   * Send multiple messages to Kafka
   */
  async sendMessages(messages: KafkaMessage[]): Promise<void> {
    try {
      const messagesByTopic = messages.reduce(
        (acc, message) => {
          if (!acc[message.topic]) {
            acc[message.topic] = [];
          }

          acc[message.topic].push({
            key: message.key ? Buffer.from(message.key) : null,
            value:
              typeof message.value === 'string'
                ? Buffer.from(message.value)
                : message.value,
            headers: message.headers,
            timestamp: message.timestamp,
          });

          return acc;
        },
        {} as Record<
          string,
          Array<{
            key: Buffer | null;
            value: Buffer;
            headers?: Record<string, string>;
            timestamp?: string;
          }>
        >,
      );

      for (const [topic, topicMessages] of Object.entries(messagesByTopic)) {
        await this.producer.send({
          topic,
          messages: topicMessages,
        });
      }

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Batch messages sent successfully',
        {
          messageCount: messages.length,
          topics: Object.keys(messagesByTopic),
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to send batch messages',
        error,
      );
      throw error;
    }
  }

  /**
   * Subscribe to a topic and handle messages
   */
  async subscribe(
    topics: string[],
    consumerConfig: KafkaConsumerConfig,
    messageHandler: MessageHandler,
  ): Promise<void> {
    try {
      const consumer = this.kafka.consumer({
        groupId: consumerConfig.groupId,
        sessionTimeout: consumerConfig.sessionTimeout || 30000,
        heartbeatInterval: consumerConfig.heartbeatInterval || 3000,
        maxBytesPerPartition: consumerConfig.maxBytesPerPartition || 1048576,
        minBytes: consumerConfig.minBytes || 1,
        maxBytes: consumerConfig.maxBytes || 10485760,
        maxWaitTimeInMs: consumerConfig.maxWaitTimeInMs || 5000,
      });

      await consumer.connect();
      await consumer.subscribe({ topics, fromBeginning: false });

      await consumer.run({
        eachMessage: async (payload: EachMessagePayload) => {
          try {
            LoggerUtil.logDebug(
              this.logger,
              this.context,
              'Processing message',
              {
                topic: payload.topic,
                partition: payload.partition,
                offset: payload.message.offset,
                key: payload.message.key?.toString(),
              },
            );

            await messageHandler(payload);

            LoggerUtil.logDebug(
              this.logger,
              this.context,
              'Message processed successfully',
              {
                topic: payload.topic,
                partition: payload.partition,
                offset: payload.message.offset,
              },
            );
          } catch (error) {
            LoggerUtil.logError(
              this.logger,
              this.context,
              'Error processing message',
              error,
              {
                topic: payload.topic,
                partition: payload.partition,
                offset: payload.message.offset,
              },
            );
            // In production, you might want to implement dead letter queue logic here
            throw error;
          }
        },
      });

      this.consumers.set(consumerConfig.groupId, consumer);

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Consumer started successfully',
        {
          topics,
          groupId: consumerConfig.groupId,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to start consumer',
        error,
      );
      throw error;
    }
  }

  /**
   * Stop a specific consumer
   */
  async stopConsumer(groupId: string): Promise<void> {
    try {
      const consumer = this.consumers.get(groupId);
      if (consumer) {
        await consumer.stop();
        await consumer.disconnect();
        this.consumers.delete(groupId);

        LoggerUtil.logInfo(
          this.logger,
          this.context,
          'Consumer stopped successfully',
          { groupId },
        );
      }
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to stop consumer',
        error,
      );
      throw error;
    }
  }

  /**
   * Create topics (useful for development/testing)
   */
  async createTopics(
    topics: Array<{
      topic: string;
      numPartitions?: number;
      replicationFactor?: number;
    }>,
  ): Promise<void> {
    try {
      const admin = this.kafka.admin();
      await admin.connect();

      const topicsToCreate = topics.map((t) => ({
        topic: t.topic,
        numPartitions: t.numPartitions || 1,
        replicationFactor: t.replicationFactor || 1,
      }));

      await admin.createTopics({
        topics: topicsToCreate,
      });

      await admin.disconnect();

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Topics created successfully',
        {
          topics: topics.map((t) => t.topic),
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to create topics',
        error,
      );
      throw error;
    }
  }

  /**
   * Get Kafka client for advanced operations
   */
  getKafkaClient(): Kafka {
    return this.kafka;
  }

  /**
   * Check if producer is connected
   */
  isProducerConnected(): boolean {
    // KafkaJS doesn't expose connection status directly
    // This is a simple check based on producer existence
    return !!this.producer;
  }

  /**
   * Get list of active consumer group IDs
   */
  getActiveConsumerGroups(): string[] {
    return Array.from(this.consumers.keys());
  }
}
