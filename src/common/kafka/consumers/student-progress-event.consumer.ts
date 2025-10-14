import { Injectable, OnModuleInit } from '@nestjs/common';
import { EachMessagePayload } from 'kafkajs';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { KafkaService, MessageHandler } from '../kafka.service';
import { Neo4jService } from '../../neo4j/neo4j.service';
import { LoggerUtil } from '../../utils/logger.util';

/**
 * Interface for student progress event data
 */
export interface StudentProgressEvent {
  eventType: 'knowledge_updated' | 'quiz_submitted';
  studentId: string;
  conceptId?: string;
  quizId?: string;
  score?: number;
  masteryLevel?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class StudentProgressEventConsumer implements OnModuleInit {
  private readonly context = 'StudentProgressEventConsumer';

  constructor(
    private readonly kafkaService: KafkaService,
    private readonly neo4jService: Neo4jService,
    @InjectPinoLogger(StudentProgressEventConsumer.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const messageHandler: MessageHandler =
        this.handleProgressEvent.bind(this);

      await this.kafkaService.subscribe(
        ['student.knowledge.updated', 'quiz.submission'],
        {
          groupId: 'content-service-progress-group',
          sessionTimeout: 30000,
          heartbeatInterval: 3000,
        },
        messageHandler,
      );

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Student progress event consumer initialized successfully',
        { topics: ['student.knowledge.updated', 'quiz.submission'] },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to initialize student progress event consumer',
        error,
      );
      throw error;
    }
  }

  /**
   * Handles incoming student progress events from Kafka
   */
  private async handleProgressEvent(
    payload: EachMessagePayload,
  ): Promise<void> {
    try {
      const { topic, partition, message } = payload;

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Processing student progress event',
        {
          topic,
          partition,
          offset: message.offset,
          key: message.key?.toString(),
        },
      );

      // Parse the message value
      const messageValue = message.value?.toString();
      if (!messageValue) {
        throw new Error('Message value is empty');
      }

      const progressEvent = JSON.parse(messageValue) as StudentProgressEvent;

      // Validate the message structure
      this.validateProgressEvent(progressEvent);

      // Process the progress event based on type
      await this.processProgressEvent(progressEvent, topic);

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Successfully processed student progress event',
        {
          eventType: progressEvent.eventType,
          studentId: progressEvent.studentId,
          conceptId: progressEvent.conceptId,
          quizId: progressEvent.quizId,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to process student progress event',
        error,
        {
          topic: payload.topic,
          partition: payload.partition,
          offset: payload.message.offset,
        },
      );
      throw error;
    }
  }

  /**
   * Validates the structure of a student progress event message
   */
  private validateProgressEvent(event: StudentProgressEvent): void {
    if (!event.studentId) {
      throw new Error('Student ID is required');
    }

    if (!event.eventType) {
      throw new Error('Event type is required');
    }

    if (!['knowledge_updated', 'quiz_submitted'].includes(event.eventType)) {
      throw new Error(`Invalid event type: ${event.eventType}`);
    }

    if (!event.timestamp) {
      throw new Error('Timestamp is required');
    }

    // Validate specific event type requirements
    if (event.eventType === 'knowledge_updated' && !event.conceptId) {
      throw new Error('Concept ID is required for knowledge_updated events');
    }

    if (event.eventType === 'quiz_submitted' && !event.quizId) {
      throw new Error('Quiz ID is required for quiz_submitted events');
    }
  }

  /**
   * Processes a student progress event based on its type
   */
  private async processProgressEvent(
    event: StudentProgressEvent,
    topic: string,
  ): Promise<void> {
    switch (event.eventType) {
      case 'knowledge_updated':
        await this.handleKnowledgeUpdate(event);
        break;
      case 'quiz_submitted':
        await this.handleQuizSubmission(event);
        break;
      default:
        LoggerUtil.logWarn(
          this.logger,
          this.context,
          'Unknown event type received',
          { eventType: event.eventType, topic },
        );
    }
  }

  /**
   * Handles knowledge update events
   */
  private async handleKnowledgeUpdate(
    event: StudentProgressEvent,
  ): Promise<void> {
    const cypher = `
      MATCH (s:Student {id: $studentId})
      MATCH (c:Concept {id: $conceptId})
      MERGE (s)-[k:KNOWS]->(c)
      SET k.masteryLevel = COALESCE($masteryLevel, k.masteryLevel, 0.0),
          k.lastUpdated = datetime($timestamp),
          k.score = COALESCE($score, k.score)
      RETURN k
    `;

    const parameters = {
      studentId: event.studentId,
      conceptId: event.conceptId,
      masteryLevel: event.masteryLevel || 0.0,
      score: event.score,
      timestamp: event.timestamp,
    };

    try {
      await this.neo4jService.write(cypher, parameters);

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Updated student knowledge state',
        {
          studentId: event.studentId,
          conceptId: event.conceptId,
          masteryLevel: event.masteryLevel,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to update student knowledge state',
        error,
        { event },
      );
      throw error;
    }
  }

  /**
   * Handles quiz submission events
   */
  private async handleQuizSubmission(
    event: StudentProgressEvent,
  ): Promise<void> {
    const cypher = `
      MATCH (s:Student {id: $studentId})
      MATCH (q:Quiz {id: $quizId})
      MERGE (s)-[a:ATTEMPTED]->(q)
      SET a.score = $score,
          a.submissionTime = datetime($timestamp),
          a.lastAttempt = datetime($timestamp)
      WITH s, q, a
      OPTIONAL MATCH (q)-[:TESTS]->(c:Concept)
      WITH s, c, a.score as quizScore
      WHERE c IS NOT NULL
      MERGE (s)-[k:KNOWS]->(c)
      SET k.lastQuizScore = quizScore,
          k.lastUpdated = datetime($timestamp)
      RETURN count(k) as updatedKnowledge
    `;

    const parameters = {
      studentId: event.studentId,
      quizId: event.quizId,
      score: event.score || 0,
      timestamp: event.timestamp,
    };

    try {
      const result = (await this.neo4jService.write(
        cypher,
        parameters,
      )) as unknown;

      LoggerUtil.logInfo(
        this.logger,
        this.context,
        'Processed quiz submission',
        {
          studentId: event.studentId,
          quizId: event.quizId,
          score: event.score,
          result,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Failed to process quiz submission',
        error,
        { event },
      );
      throw error;
    }
  }
}
