import { KafkaConfig as KafkaJSConfig } from 'kafkajs';

export type KafkaConfig = KafkaJSConfig;

export interface KafkaProducerConfig {
  maxInFlightRequests?: number;
  idempotent?: boolean;
  transactionTimeout?: number;
}

export interface KafkaConsumerConfig {
  groupId: string;
  sessionTimeout?: number;
  heartbeatInterval?: number;
  maxBytesPerPartition?: number;
  minBytes?: number;
  maxBytes?: number;
  maxWaitTimeInMs?: number;
}

export interface KafkaMessage {
  topic: string;
  partition?: number;
  key?: string;
  value: string | Buffer;
  headers?: Record<string, string>;
  timestamp?: string;
}
