import { Injectable } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { KafkaService } from '../kafka.service';
import { LoggerUtil } from '../../utils/logger.util';

export interface ContentEvent {
  eventType: 'created' | 'updated' | 'deleted';
  contentType: 'quiz' | 'question' | 'resource' | 'concept';
  contentId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

@Injectable()
export class ContentEventProducer {
  private readonly context = 'ContentEventProducer';

  constructor(
    private readonly kafkaService: KafkaService,
    @InjectPinoLogger(ContentEventProducer.name)
    private readonly logger: PinoLogger,
  ) {}

  async publishContentCreated(
    contentType: ContentEvent['contentType'],
    contentId: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const event: ContentEvent = {
      eventType: 'created',
      contentType,
      contentId,
      userId,
      timestamp: new Date(),
      metadata,
    };

    await this.publishEvent(`content.${contentType}.created`, event);
  }

  async publishContentUpdated(
    contentType: ContentEvent['contentType'],
    contentId: string,
    userId: string,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const event: ContentEvent = {
      eventType: 'updated',
      contentType,
      contentId,
      userId,
      timestamp: new Date(),
      metadata,
    };

    await this.publishEvent(`content.${contentType}.updated`, event);
  }

  async publishContentDeleted(
    contentType: ContentEvent['contentType'],
    contentId: string,
    userId: string,
  ): Promise<void> {
    const event: ContentEvent = {
      eventType: 'deleted',
      contentType,
      contentId,
      userId,
      timestamp: new Date(),
    };

    await this.publishEvent(`content.${contentType}.deleted`, event);
  }

  async publishQuizSubmission(
    quizId: string,
    studentId: string,
    score: number,
    answers: Record<string, any>,
    completionTime: number,
  ): Promise<void> {
    const event = {
      eventType: 'quiz_submitted',
      quizId,
      studentId,
      score,
      answers,
      completionTime,
      timestamp: new Date(),
    };

    await this.publishEvent('quiz.submission', event);
  }

  async publishStudentProgressUpdate(
    studentId: string,
    conceptId: string,
    previousKnowledgeLevel: number,
    newKnowledgeLevel: number,
    source: 'quiz' | 'lesson' | 'assessment',
  ): Promise<void> {
    const event = {
      eventType: 'knowledge_updated',
      studentId,
      conceptId,
      previousKnowledgeLevel,
      newKnowledgeLevel,
      source,
      timestamp: new Date(),
    };

    await this.publishEvent('student.knowledge.updated', event);
  }

  private async publishEvent(topic: string, event: any): Promise<void> {
    try {
      await this.kafkaService.sendMessage({
        topic,
        key: event.studentId || event.userId || event.contentId,
        value: JSON.stringify(event),
        headers: {
          'content-type': 'application/json',
          'event-source': 'content-service',
          'event-version': '1.0',
        },
      });

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Event published successfully',
        {
          topic,
          eventType: event.eventType,
          key: event.studentId || event.userId || event.contentId,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to publish event',
        error,
        {
          topic,
          event,
        },
      );
      throw error;
    }
  }
}
