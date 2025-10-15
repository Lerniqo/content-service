/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit, Inject, forwardRef } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { EachMessagePayload } from 'kafkajs';
import { LoggerUtil } from '../../utils/logger.util';
import { KafkaService, MessageHandler } from '../kafka.service';

/**
 * Interface for learning path step data
 */
export interface LearningPathStep {
  stepNumber: number;
  title: string;
  description: string;
  estimatedDuration: string;
  resources: string[];
  prerequisites: number[];
}

/**
 * Interface for learning path details
 */
export interface LearningPathDetails {
  goal: string;
  difficulty_level: string;
  total_duration: string;
  steps: LearningPathStep[];
}

/**
 * Interface for incoming learning path message
 */
export interface LearningPathMessage {
  user_id: string;
  learning_goal: string;
  learning_path: LearningPathDetails;
  mastery_scores?: Record<string, any>;
  available_resources?: any[];
}

@Injectable()
export class LearningPathConsumer implements OnModuleInit {
  private readonly context = 'LearningPathConsumer';
  private learningPathService: any;

  constructor(
    private readonly kafkaService: KafkaService,
    @InjectPinoLogger(LearningPathConsumer.name)
    private readonly logger: PinoLogger,
  ) {}

  // Method to set the learning path service (to avoid circular dependency)
  setLearningPathService(service: any): void {
    this.learningPathService = service;
  }

  async onModuleInit(): Promise<void> {
    try {
      const messageHandler: MessageHandler =
        this.handleLearningPath.bind(this);
      await this.kafkaService.subscribe(
        ['learning_path'],
        {
          groupId: 'content-service-learning-path-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
        },
        messageHandler,
      );

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Learning path consumer initialized successfully',
        { topic: 'learning_path' },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to initialize learning path consumer',
        error,
      );
      throw error;
    }
  }

  async handleLearningPath(payload: EachMessagePayload): Promise<void> {
    const { topic, partition, message } = payload;
    const value = message.value?.toString();

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Message received',
        {
          topic,
          partition,
          offset: message.offset,
        },
      );    if (!value) {
      LoggerUtil.logWarn(
        this.logger,
        this.context,
        'Empty message received',
        { topic, partition },
      );
      return;
    }

    try {
      const learningPathData = JSON.parse(value) as LearningPathMessage;

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Processing learning path',
        { userId: learningPathData.user_id },
      );

      // Validate required fields
      if (!learningPathData.user_id || !learningPathData.learning_path) {
        LoggerUtil.logError(
          this.logger,
          this.context,
          'Invalid learning path data: missing required fields',
          learningPathData,
        );
        return;
      }

      // Wait for service to be available
      if (!this.learningPathService) {
        LoggerUtil.logError(
          this.logger,
          this.context,
          'Learning path service not available',
          {},
        );
        return;
      }

      // Save the learning path
      await this.learningPathService.saveLearningPath(learningPathData);

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Learning path processed successfully',
        { userId: learningPathData.user_id },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to process learning path',
        error,
      );
      // Don't throw error to avoid infinite retry loop
      // Consider implementing dead letter queue for failed messages
    }
  }
}
