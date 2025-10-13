import { Injectable, OnModuleInit } from '@nestjs/common';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { EachMessagePayload } from 'kafkajs';
import { KafkaService } from '../kafka.service';
import { LoggerUtil } from '../../utils/logger.util';

@Injectable()
export class StudentProgressEventConsumer implements OnModuleInit {
  private readonly context = 'StudentProgressEventConsumer';

  constructor(
    private readonly kafkaService: KafkaService,
    @InjectPinoLogger(StudentProgressEventConsumer.name)
    private readonly logger: PinoLogger,
  ) {}

  async onModuleInit() {
    // Subscribe to student progress events
    await this.kafkaService.subscribe(
      ['student.progress.updated', 'quiz.completed', 'lesson.completed'],
      {
        groupId: 'content-service-consumer-group',
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
      },
      this.handleProgressEvent.bind(this),
    );

    LoggerUtil.logInfo(
      this.logger,
      this.context,
      'Student progress event consumer started',
    );
  }

  private async handleProgressEvent(
    payload: EachMessagePayload,
  ): Promise<void> {
    const { topic, partition, message } = payload;

    try {
      const eventData = JSON.parse(message.value?.toString() || '{}');

      LoggerUtil.logDebug(
        this.logger,
        this.context,
        'Processing progress event',
        {
          topic,
          partition,
          offset: message.offset,
          eventData,
        },
      );

      switch (topic) {
        case 'student.progress.updated':
          await this.handleStudentProgressUpdate(eventData);
          break;
        case 'quiz.completed':
          await this.handleQuizCompletion(eventData);
          break;
        case 'lesson.completed':
          await this.handleLessonCompletion(eventData);
          break;
        default:
          LoggerUtil.logWarn(
            this.logger,
            this.context,
            'Unknown topic received',
            { topic },
          );
      }
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        this.context,
        'Error processing progress event',
        error,
        { topic, partition, offset: message.offset },
      );
      throw error; // Re-throw to trigger retry mechanism
    }
  }

  private async handleStudentProgressUpdate(eventData: any): Promise<void> {
    // TODO: Implement logic to update student knowledge state
    // This could involve updating Neo4j relationships or calling other services
    LoggerUtil.logInfo(this.logger, this.context, 'Student progress updated', {
      studentId: eventData.studentId,
      conceptId: eventData.conceptId,
      newKnowledgeLevel: eventData.knowledgeLevel,
    });
  }

  private async handleQuizCompletion(eventData: any): Promise<void> {
    // TODO: Implement logic to process quiz completion
    LoggerUtil.logInfo(this.logger, this.context, 'Quiz completion processed', {
      studentId: eventData.studentId,
      quizId: eventData.quizId,
      score: eventData.score,
    });
  }

  private async handleLessonCompletion(eventData: any): Promise<void> {
    // TODO: Implement logic to process lesson completion
    LoggerUtil.logInfo(
      this.logger,
      this.context,
      'Lesson completion processed',
      {
        studentId: eventData.studentId,
        lessonId: eventData.lessonId,
        completionTime: eventData.completionTime,
      },
    );
  }
}
