import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { UpdateQuizDto } from './dto/update-quiz.dto';
import { CreateQuizResponseDto } from './dto/create-quiz-response.dto';
import { QuizResponseDto } from './dto/quiz-response.dto';
import { QuizzesService } from './quizzes.service';
import { PinoLogger } from 'nestjs-pino';
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
@Controller('quizzes')
export class QuizzesController {
  constructor(
    private readonly quizzesService: QuizzesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QuizzesController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
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
    description:
      'Bad Request - Invalid input data, validation errors, or questions not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          oneOf: [
            {
              type: 'string',
              example: 'Questions not found: question-001, question-002',
            },
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

    LoggerUtil.logInfo(this.logger, 'QuizzesController', 'Creating new quiz', {
      title: createQuizDto.title,
      conceptId: createQuizDto.conceptId,
      questionCount: createQuizDto.questionIds.length,
      timeLimit: createQuizDto.timeLimit,
      userId,
      hasDescription: !!createQuizDto.description,
    });

    try {
      const result = await this.quizzesService.createQuiz(
        createQuizDto,
        userId,
      );

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

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all quizzes',
    description:
      'Retrieves all quizzes with their questions. This endpoint is protected and requires authentication. All authenticated users (students, teachers, admins) can access quizzes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Quizzes retrieved successfully',
    type: [QuizResponseDto],
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
            description: 'Unique identifier for the quiz',
          },
          title: {
            type: 'string',
            example: 'Basic Mathematics Quiz',
            description: 'Title of the quiz',
          },
          description: {
            type: 'string',
            example:
              'A comprehensive quiz covering basic mathematical concepts',
            description: 'Description of the quiz',
          },
          timeLimit: {
            type: 'number',
            example: 3600,
            description: 'Time limit for the quiz in seconds',
          },
          questions: {
            type: 'array',
            description: 'Array of questions included in this quiz',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: 'question-001',
                  description: 'ID of the question',
                },
                questionText: {
                  type: 'string',
                  example: 'What is 2 + 2?',
                  description: 'The question text',
                },
                options: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['2', '3', '4', '5'],
                  description: 'Answer options',
                },
                correctAnswer: {
                  type: 'string',
                  example: '4',
                  description: 'The correct answer',
                },
              },
            },
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-10-04T10:30:00Z',
            description: 'Creation date of the quiz',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-10-04T10:30:00Z',
            description: 'Last update date of the quiz',
          },
        },
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
    description: 'Forbidden - Valid user role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Forbidden resource' },
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
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async getAllQuizzes(
    @Req() req: AuthenticatedRequest,
  ): Promise<QuizResponseDto[]> {
    const userId = req.user.id;

    LoggerUtil.logInfo(
      this.logger,
      'QuizzesController',
      'Fetching all quizzes',
      { userId },
    );

    try {
      const result = await this.quizzesService.getAllQuizzes();

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesController',
        'All quizzes retrieved successfully',
        {
          userId,
          quizzesCount: result.length,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesController',
        'Failed to retrieve all quizzes',
        error,
        { userId },
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get quiz by ID',
    description:
      'Retrieves a specific quiz with all its questions. This endpoint is protected and requires authentication. All authenticated users (students, teachers, admins) can access quizzes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz retrieved successfully',
    type: QuizResponseDto,
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          format: 'uuid',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          description: 'Unique identifier for the quiz',
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
        questions: {
          type: 'array',
          description: 'Array of questions included in this quiz',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: 'question-001',
                description: 'ID of the question',
              },
              questionText: {
                type: 'string',
                example: 'What is 2 + 2?',
                description: 'The question text',
              },
              options: {
                type: 'array',
                items: { type: 'string' },
                example: ['2', '3', '4', '5'],
                description: 'Answer options',
              },
              correctAnswer: {
                type: 'string',
                example: '4',
                description: 'The correct answer',
              },
              explanation: {
                type: 'string',
                example: 'Adding 2 + 2 equals 4',
                description: 'Explanation for the correct answer',
              },
              tags: {
                type: 'array',
                items: { type: 'string' },
                example: ['mathematics', 'addition'],
                description: 'Tags associated with the question',
              },
            },
          },
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-10-04T10:30:00Z',
          description: 'Creation date of the quiz',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-10-04T10:30:00Z',
          description: 'Last update date of the quiz',
        },
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
    description: 'Forbidden - Valid user role required',
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
    description: 'Not Found - Quiz with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Quiz with ID abc123 not found',
        },
        error: { type: 'string', example: 'Not Found' },
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
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async getQuizById(
    @Param('id') quizId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<QuizResponseDto> {
    const userId = req.user.id;

    LoggerUtil.logInfo(
      this.logger,
      'QuizzesController',
      'Protected quiz request received',
      { quizId, userId },
    );

    try {
      const result = await this.quizzesService.getQuizById(quizId);

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesController',
        'Quiz retrieved successfully',
        {
          quizId,
          userId,
          questionsCount: result.questions.length,
          title: result.title,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesController',
        'Failed to retrieve quiz',
        error,
        { quizId, userId },
      );
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a quiz',
    description:
      'Updates an existing quiz. Can update title, description, time limit, concept, and/or questions. Teacher and Admin roles required.',
  })
  @ApiBody({
    type: UpdateQuizDto,
    description: 'The quiz data to update (all fields are optional)',
  })
  @ApiResponse({
    status: 200,
    description: 'Quiz updated successfully',
    type: QuizResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or validation errors',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          oneOf: [
            { type: 'string', example: 'Questions not found: question-001' },
            {
              type: 'array',
              items: { type: 'string' },
              example: ['Time limit must be at least 60 seconds'],
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
    description: 'Not Found - Quiz or Concept not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Quiz with ID abc123 not found',
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
  async updateQuiz(
    @Param('id') quizId: string,
    @Body() updateQuizDto: UpdateQuizDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<QuizResponseDto> {
    const userId = req.user.id;

    LoggerUtil.logInfo(this.logger, 'QuizzesController', 'Updating quiz', {
      quizId,
      userId,
      updates: Object.keys(updateQuizDto),
    });

    try {
      const result = await this.quizzesService.updateQuiz(
        quizId,
        updateQuizDto,
        userId,
      );

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesController',
        'Quiz updated successfully',
        {
          quizId,
          userId,
          title: result.title,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesController',
        'Failed to update quiz',
        error,
        {
          quizId,
          userId,
        },
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a quiz',
    description:
      'Deletes a quiz and all its relationships. Teacher and Admin roles required.',
  })
  @ApiResponse({
    status: 204,
    description: 'Quiz deleted successfully',
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
    description: 'Not Found - Quiz with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Quiz with ID abc123 not found',
        },
        error: { type: 'string', example: 'Not Found' },
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
  async deleteQuiz(
    @Param('id') quizId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    const userId = req.user.id;

    LoggerUtil.logInfo(this.logger, 'QuizzesController', 'Deleting quiz', {
      quizId,
      userId,
    });

    try {
      await this.quizzesService.deleteQuiz(quizId, userId);

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesController',
        'Quiz deleted successfully',
        {
          quizId,
          userId,
        },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesController',
        'Failed to delete quiz',
        error,
        {
          quizId,
          userId,
        },
      );
      throw error;
    }
  }

  @Get('concept/:conceptId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get quizzes by Concept ID',
    description:
      'Retrieves all quizzes associated with a specific concept. This endpoint is protected and requires authentication. All authenticated users (students, teachers, admins) can access quizzes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Quizzes retrieved successfully',
    type: [QuizResponseDto],
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
    description: 'Forbidden - Valid user role required',
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
    description: 'Not Found - Concept with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Concept with ID concept-math-001 not found',
        },
        error: { type: 'string', example: 'Not Found' },
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
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async getQuizzesByConceptId(
    @Param('conceptId') conceptId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<QuizResponseDto[]> {
    const userId = req.user.id;

    LoggerUtil.logInfo(
      this.logger,
      'QuizzesController',
      'Protected quizzes by concept request received',
      { conceptId, userId },
    );

    try {
      const result = await this.quizzesService.getQuizzesByConceptId(conceptId);

      LoggerUtil.logInfo(
        this.logger,
        'QuizzesController',
        'Quizzes retrieved successfully',
        {
          conceptId,
          userId,
          quizzesCount: result.length,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuizzesController',
        'Failed to retrieve quizzes by concept',
        error,
        { conceptId, userId },
      );
      throw error;
    }
  }
}
