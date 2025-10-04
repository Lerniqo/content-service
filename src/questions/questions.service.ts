/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuestionResponseDto } from './dto/create-question-response.dto';
import { LoggerUtil } from '../common/utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly neo4jService: Neo4jService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QuestionsService.name);
  }

  async createQuestion(createQuestionDto: CreateQuestionDto): Promise<CreateQuestionResponseDto> {
    const questionId = createQuestionDto.id || uuidv4();
    
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsService',
      'Creating new question',
      {
        questionId,
        providedId: !!createQuestionDto.id,
        questionText: createQuestionDto.questionText.substring(0, 50) + '...',
        optionsCount: createQuestionDto.options.length,
      },
    );

    try {
      // Check if question already exists
      await this.checkQuestionExists(questionId);

      // Validate that correctAnswer is in options
      this.validateCorrectAnswer(createQuestionDto);

      // Create the Question node
      await this.createQuestionNode(questionId, createQuestionDto);

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsService',
        'Question created successfully',
        { questionId },
      );

      return new CreateQuestionResponseDto(questionId);
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Failed to create question',
        error,
        { questionId },
      );
      
      // Cleanup: attempt to remove any partially created data
      await this.cleanupPartialQuestion(questionId);
      
      throw error;
    }
  }

  private async checkQuestionExists(questionId: string): Promise<void> {
    const query = `
      MATCH (q:Question {id: $questionId})
      RETURN q.id as id
    `;

    try {
      const result = (await this.neo4jService.read(query, {
        questionId,
      })) as any[];
      
      if (result.length > 0) {
        throw new ConflictException(`Question with ID ${questionId} already exists`);
      }
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Error checking question existence',
        error,
        { questionId },
      );
      
      throw new InternalServerErrorException(
        'Failed to verify question uniqueness',
      );
    }
  }

  private validateCorrectAnswer(createQuestionDto: CreateQuestionDto): void {
    if (!createQuestionDto.options.includes(createQuestionDto.correctAnswer)) {
      throw new InternalServerErrorException(
        'Correct answer must be one of the provided options'
      );
    }
  }

  private async createQuestionNode(questionId: string, createQuestionDto: CreateQuestionDto): Promise<void> {
    const query = `
      CREATE (q:Question {
        id: $id,
        questionText: $questionText,
        options: $options,
        correctAnswer: $correctAnswer,
        explanation: $explanation,
        tags: $tags,
        createdAt: $createdAt,
        updatedAt: $updatedAt
      })
      RETURN q.id as id
    `;

    const params = {
      id: questionId,
      questionText: createQuestionDto.questionText,
      options: createQuestionDto.options,
      correctAnswer: createQuestionDto.correctAnswer,
      explanation: createQuestionDto.explanation || null,
      tags: createQuestionDto.tags || [],
      createdAt: createQuestionDto.createdAt ? 
        new Date(createQuestionDto.createdAt).toISOString() : 
        new Date().toISOString(),
      updatedAt: createQuestionDto.updatedAt ? 
        new Date(createQuestionDto.updatedAt).toISOString() : 
        new Date().toISOString(),
    };

    try {
      const result = (await this.neo4jService.write(query, params)) as any[];
      
      if (result.length === 0) {
        throw new InternalServerErrorException(
          'Failed to create question node',
        );
      }
      
      LoggerUtil.logDebug(
        this.logger,
        'QuestionsService',
        'Question node created successfully',
        { questionId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Error creating question node',
        error,
        { questionId, params },
      );
      
      throw new InternalServerErrorException('Failed to create question node');
    }
  }

  private async cleanupPartialQuestion(questionId: string): Promise<void> {
    const query = `
      MATCH (q:Question {id: $questionId})
      DETACH DELETE q
    `;

    try {
      await this.neo4jService.write(query, { questionId });
      
      LoggerUtil.logInfo(
        this.logger,
        'QuestionsService',
        'Cleaned up partial question',
        { questionId },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Failed to cleanup partial question',
        error,
        { questionId },
      );
    }
  }
}