/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { EachMessagePayload } from 'kafkajs';
import { LoggerUtil } from '../../utils/logger.util';
import { KafkaService, MessageHandler } from '../kafka.service';

/**
 * Interface for learning path step data
 */
export interface LearningPathStep {
  step_number: number;
  title: string;
  description: string;
  estimated_duration: string;
  resources: string[];
  prerequisites: string[];
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
 * Interface for learning path response event data
 */
export interface LearningPathResponseEventData {
  request_id: string;
  status: string; // 'completed' or 'failed'
  user_id: string;
  goal?: string;
  learning_path?: LearningPathDetails;
  error?: string;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Interface for incoming learning path response message
 */
export interface LearningPathResponseMessage {
  eventId: string;
  eventType: string; // 'learning_path.response'
  eventData: LearningPathResponseEventData;
  userId: string;
  metadata?: Record<string, any>;
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
        ['learning_path.response'],
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
        { topic: 'learning_path.response' },
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
      const responseMessage = JSON.parse(value) as LearningPathResponseMessage;

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Processing learning path response',
        { 
          userId: responseMessage.eventData.user_id,
          status: responseMessage.eventData.status,
          requestId: responseMessage.eventData.request_id,
        },
      );

      // Validate required fields
      if (!responseMessage.eventData || !responseMessage.eventData.user_id) {
        LoggerUtil.logError(
          this.logger,
          this.context,
          'Invalid learning path response: missing required fields',
          responseMessage,
        );
        return;
      }

      // Check if the response indicates failure
      if (responseMessage.eventData.status === 'failed') {
        LoggerUtil.logError(
          this.logger,
          this.context,
          'Learning path generation failed',
          {
            userId: responseMessage.eventData.user_id,
            error: responseMessage.eventData.error,
            requestId: responseMessage.eventData.request_id,
          },
        );
        // TODO: Update learning path status to 'failed' in database
        return;
      }

      // Check if learning path data exists
      if (!responseMessage.eventData.learning_path) {
        LoggerUtil.logError(
          this.logger,
          this.context,
          'Learning path response missing learning_path data',
          responseMessage.eventData,
        );
        return;
      }

      // Wait for service to be available
      if (!this.learningPathService) {
        LoggerUtil.logError(
          this.logger,
          this.context,
          'Learning path service not available - skipping message processing',
          { userId: responseMessage.eventData.user_id },
        );
        // Don't throw error, just log and skip - service will process on retry
        return;
      }

      // Transform the response to the format expected by saveLearningPath
      const learningPathData = {
        user_id: responseMessage.eventData.user_id,
        learning_goal: responseMessage.eventData.goal,
        learning_path: responseMessage.eventData.learning_path,
        mastery_scores: responseMessage.eventData.metadata?.mastery_scores || {},
        available_resources: responseMessage.eventData.metadata?.available_resources || [],
      };

      // Save the learning path
      await this.learningPathService.saveLearningPath(learningPathData);

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Learning path processed successfully',
        { 
          userId: responseMessage.eventData.user_id,
          requestId: responseMessage.eventData.request_id,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to process learning path response',
        error,
      );
      // Don't throw error to avoid infinite retry loop
      // Consider implementing dead letter queue for failed messages
    }
  }
}
