/* eslint-disable prettier/prettier */
import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Neo4jService } from '../common/neo4j/neo4j.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuestionResponseDto } from './dto/create-question-response.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { LoggerUtil } from '../common/utils/logger.util';
import { v4 as uuidv4 } from 'uuid';

interface QuestionNodeProperties {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

interface QuestionQueryResult {
  q: {
    properties: QuestionNodeProperties;
  };
}

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
  
  async findAll(): Promise<QuestionResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsService',
      'Fetching all questions',
    );

    const query = `
      MATCH (q:Question)
      RETURN q
      ORDER BY q.createdAt DESC
    `;

    try {
      const result = (await this.neo4jService.read(query, {})) as QuestionQueryResult[];
      
      const questions = result.map(record => {
        const questionNode = record.q.properties;
        return new QuestionResponseDto({
          id: questionNode.id,
          questionText: questionNode.questionText,
          options: questionNode.options,
          correctAnswer: questionNode.correctAnswer,
          explanation: questionNode.explanation,
          tags: questionNode.tags || [],
          createdAt: questionNode.createdAt,
          updatedAt: questionNode.updatedAt,
        });
      });

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsService',
        'Questions fetched successfully',
        { count: questions.length },
      );

      return questions;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Error fetching questions',
        error,
      );
      
      throw new InternalServerErrorException('Failed to fetch questions');
    }
  }

  async findOne(id: string): Promise<QuestionResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsService',
      'Fetching question by ID',
      { questionId: id },
    );

    const query = `
      MATCH (q:Question {id: $id})
      RETURN q
    `;

    try {
      const result = (await this.neo4jService.read(query, { id })) as QuestionQueryResult[];
      
      if (result.length === 0) {
        throw new NotFoundException(`Question with ID ${id} not found`);
      }

      const questionNode = result[0].q.properties;
      const question = new QuestionResponseDto({
        id: questionNode.id,
        questionText: questionNode.questionText,
        options: questionNode.options,
        correctAnswer: questionNode.correctAnswer,
        explanation: questionNode.explanation,
        tags: questionNode.tags || [],
        createdAt: questionNode.createdAt,
        updatedAt: questionNode.updatedAt,
      });

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsService',
        'Question fetched successfully',
        { questionId: id },
      );

      return question;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Error fetching question',
        error,
        { questionId: id },
      );
      
      throw new InternalServerErrorException('Failed to fetch question');
    }
  }

  async updateQuestion(id: string, updateQuestionDto: UpdateQuestionDto): Promise<QuestionResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsService',
      'Updating question',
      { questionId: id },
    );

    // First check if question exists
    await this.findOne(id);

    // Validate correctAnswer if both options and correctAnswer are provided
    if (updateQuestionDto.options && updateQuestionDto.correctAnswer) {
      if (!updateQuestionDto.options.includes(updateQuestionDto.correctAnswer)) {
        throw new InternalServerErrorException(
          'Correct answer must be one of the provided options'
        );
      }
    } else if (updateQuestionDto.correctAnswer && !updateQuestionDto.options) {
      // If only correctAnswer is provided, validate against existing options
      const existingQuestion = await this.findOne(id);
      if (!existingQuestion.options.includes(updateQuestionDto.correctAnswer)) {
        throw new InternalServerErrorException(
          'Correct answer must be one of the existing options'
        );
      }
    } else if (updateQuestionDto.options && !updateQuestionDto.correctAnswer) {
      // If only options are provided, validate existing correctAnswer is in new options
      const existingQuestion = await this.findOne(id);
      if (!updateQuestionDto.options.includes(existingQuestion.correctAnswer)) {
        throw new InternalServerErrorException(
          'New options must include the existing correct answer, or provide a new correct answer'
        );
      }
    }

    const updateFields: string[] = [];
    const params: Record<string, any> = { id, updatedAt: new Date().toISOString() };

    if (updateQuestionDto.questionText !== undefined) {
      updateFields.push('q.questionText = $questionText');
      params.questionText = updateQuestionDto.questionText;
    }
    if (updateQuestionDto.options !== undefined) {
      updateFields.push('q.options = $options');
      params.options = updateQuestionDto.options;
    }
    if (updateQuestionDto.correctAnswer !== undefined) {
      updateFields.push('q.correctAnswer = $correctAnswer');
      params.correctAnswer = updateQuestionDto.correctAnswer;
    }
    if (updateQuestionDto.explanation !== undefined) {
      updateFields.push('q.explanation = $explanation');
      params.explanation = updateQuestionDto.explanation;
    }
    if (updateQuestionDto.tags !== undefined) {
      updateFields.push('q.tags = $tags');
      params.tags = updateQuestionDto.tags;
    }

    updateFields.push('q.updatedAt = $updatedAt');

    const query = `
      MATCH (q:Question {id: $id})
      SET ${updateFields.join(', ')}
      RETURN q
    `;

    try {
      const result = (await this.neo4jService.write(query, params)) as QuestionQueryResult[];
      
      if (result.length === 0) {
        throw new InternalServerErrorException('Failed to update question');
      }

      const questionNode = result[0].q.properties;
      const question = new QuestionResponseDto({
        id: questionNode.id,
        questionText: questionNode.questionText,
        options: questionNode.options,
        correctAnswer: questionNode.correctAnswer,
        explanation: questionNode.explanation,
        tags: questionNode.tags || [],
        createdAt: questionNode.createdAt,
        updatedAt: questionNode.updatedAt,
      });

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsService',
        'Question updated successfully',
        { questionId: id },
      );

      return question;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Error updating question',
        error,
        { questionId: id },
      );
      
      throw new InternalServerErrorException('Failed to update question');
    }
  }

  async deleteQuestion(id: string): Promise<{ message: string }> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsService',
      'Deleting question',
      { questionId: id },
    );

    // First check if question exists
    await this.findOne(id);

    const query = `
      MATCH (q:Question {id: $id})
      DETACH DELETE q
    `;

    try {
      await this.neo4jService.write(query, { id });

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsService',
        'Question deleted successfully',
        { questionId: id },
      );

      return { message: `Question with ID ${id} deleted successfully` };
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsService',
        'Error deleting question',
        error,
        { questionId: id },
      );
      
      throw new InternalServerErrorException('Failed to delete question');
    }
  }
}