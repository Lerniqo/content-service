/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuizResponseDto } from './dto/create-quiz-response.dto';
import { QuizzesService } from './quizzes.service';
import { PinoLogger } from 'nestjs-pino';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Request } from 'express';
import { LoggerUtil } from '../common/utils/logger.util';

// Extend the Request interface to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string[];
    [key: string]: any;
  };
}

@ApiTags('quizzes')
@Controller('api/content/quizzes')
@UseGuards(RolesGuard)
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QuizzesController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Create a new quiz',
    description:
      'Creates a new quiz with specified questions, links it to a concept via TESTS relationship, and creates INCLUDES relationships to questions. Teacher and Admin roles required.',
  })
  @ApiBody({
    type: CreateQuizDto,
    description: 'The quiz data to create',
  })
  @ApiResponse({
    status: 201,
    description: 'Quiz created successfully',
    type: CreateQuizResponseDto,
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          description: 'Unique identifier for the created quiz',
        },
        title: {
          type: 'string',
          example: 'Basic Mathematics Quiz',
          description: 'Title of the quiz',
        },
        description: {
          type: 'string',
          example: 'A comprehensive quiz covering basic mathematical concepts',
          description: 'Description of the quiz',
        },
        timeLimit: {
          type: 'number',
          example: 3600,
          description: 'Time limit for the quiz in seconds',
        },
        conceptId: {
          type: 'string',
          example: 'concept-math-001',
          description: 'ID of the concept this quiz tests',
        },
        questionIds: {
          type: 'array',
          items: { type: 'string' },
          example: ['question-001', 'question-002', 'question-003'],
          description: 'Array of question IDs included in this quiz',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
          description: 'Creation date of the quiz',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data, validation errors, or questions not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          oneOf: [
            { type: 'string', example: 'Questions not found: question-001, question-002' },
            {
              type: 'array',
              items: { type: 'string' },
              example: [
                'Title is required',
                'At least 1 question is required',
                'Time limit must be at least 60 seconds',
              ],
            },
          ],
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Teacher or Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Forbidden resource' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Concept not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Concept with ID concept-math-001 not found',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Database or server error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
      },
    },
  })
  async create(
    @Body() createQuizDto: CreateQuizDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateQuizResponseDto> {
    const userId = req.user.id;

    LoggerUtil.logInfo(
      this.logger,
      'QuizzesController',
      'Creating new quiz',
      {
        title: createQuizDto.title,
        conceptId: createQuizDto.conceptId,
        questionCount: createQuizDto.questionIds.length,
        timeLimit: createQuizDto.timeLimit,
        userId,
        hasDescription: !!createQuizDto.description,
      },
    );

    try {
      const result = await this.quizzesService.createQuiz(createQuizDto, userId);

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesController',
        'Quiz created successfully',
        {
          quizId: result.id,
          title: result.title,
          questionCount: result.questionIds.length,
          userId,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesController',
        'Failed to create quiz',
        error,
        {
          title: createQuizDto.title,
          conceptId: createQuizDto.conceptId,
          userId,
        },
      );
      throw error;
    }
  }
}