/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuestionResponseDto } from './dto/create-question-response.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionResponseDto } from './dto/question-response.dto';
import { QuestionsService } from './questions.service';
import { PinoLogger } from 'nestjs-pino';
import { LoggerUtil } from '../common/utils/logger.util';
import { Request } from 'express';

// Extend the Request interface to include user
interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    role: string[];
    [key: string]: any;
  };
}

@ApiTags('questions')
@Controller('questions')
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QuestionsController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new question',
    description:
      'Creates a new question node in the graph database. This endpoint is primarily for internal use or admin purposes. Admin role required.',
  })
  @ApiBody({
    type: CreateQuestionDto,
    description: 'The question data to create',
  })
  @ApiResponse({
    status: 201,
    description: 'Question created successfully',
    type: CreateQuestionResponseDto,
    schema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          example: 'question-001',
          description: 'Unique identifier for the created question',
        },
        message: {
          type: 'string',
          example: 'Question created successfully',
          description: 'Success message',
        },
      },
    },
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
            { type: 'string', example: 'Validation failed' },
            {
              type: 'array',
              items: { type: 'string' },
              example: [
                'Question text is required',
                'At least 2 options are required',
                'Correct answer must be one of the provided options',
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
    description: 'Forbidden - Admin role required',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: 'Forbidden resource' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Question with this ID already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example: 'Question with ID question-001 already exists',
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
    @Body() createQuestionDto: CreateQuestionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateQuestionResponseDto> {
    const userId = req.user.id;

    LoggerUtil.logInfo(
      this.logger,
      'QuestionsController',
      'Creating new question',
      {
        questionId: createQuestionDto.id,
        questionText: createQuestionDto.questionText.substring(0, 50) + '...',
        optionsCount: createQuestionDto.options.length,
        hasTags: !!createQuestionDto.tags?.length,
        hasExplanation: !!createQuestionDto.explanation,
        userId,
      },
    );

    try {
      const result = await this.questionsService.createQuestion(
        createQuestionDto,
        userId,
      );

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsController',
        'Question created successfully',
        {
          questionId: result.id,
          userId,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsController',
        'Failed to create question',
        error,
        {
          questionId: createQuestionDto.id,
          userId,
        },
      );
      throw error;
    }
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all questions',
    description:
      'Retrieves all questions from the database. This endpoint is public and requires no authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    type: [QuestionResponseDto],
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
  async findAll(): Promise<QuestionResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsController',
      'Fetching all questions',
    );

    try {
      const result = await this.questionsService.findAll();

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsController',
        'Questions fetched successfully',
        { count: result.length },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsController',
        'Failed to fetch questions',
        error,
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get question by ID',
    description:
      'Retrieves a specific question by its ID. This endpoint is public and requires no authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the question',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Question retrieved successfully',
    type: QuestionResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Question with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example:
            'Question with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found',
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
  async findOne(@Param('id') id: string): Promise<QuestionResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsController',
      'Fetching question by ID',
      { questionId: id },
    );

    try {
      const result = await this.questionsService.findOne(id);

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsController',
        'Question fetched successfully',
        { questionId: id },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsController',
        'Failed to fetch question',
        error,
        { questionId: id },
      );
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a question',
    description:
      'Updates an existing question in the graph database. Admin role required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the question to update',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({
    type: UpdateQuestionDto,
    description: 'The question data to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Question updated successfully',
    type: QuestionResponseDto,
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
            { type: 'string', example: 'Validation failed' },
            {
              type: 'array',
              items: { type: 'string' },
              example: ['Correct answer must be one of the provided options'],
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
    description: 'Forbidden - Admin role required',
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
    description: 'Not Found - Question with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example:
            'Question with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found',
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
  async update(
    @Param('id') id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsController',
      'Updating question',
      {
        questionId: id,
        hasQuestionText: !!updateQuestionDto.questionText,
        hasOptions: !!updateQuestionDto.options,
        hasCorrectAnswer: !!updateQuestionDto.correctAnswer,
        hasTags: !!updateQuestionDto.tags,
        hasExplanation: !!updateQuestionDto.explanation,
      },
    );

    try {
      const result = await this.questionsService.updateQuestion(
        id,
        updateQuestionDto,
      );

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsController',
        'Question updated successfully',
        { questionId: id },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsController',
        'Failed to update question',
        error,
        { questionId: id },
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a question',
    description:
      'Deletes a question from the graph database. Admin role required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Unique identifier of the question to delete',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Question deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Question with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 deleted successfully',
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
    description: 'Forbidden - Admin role required',
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
    description: 'Not Found - Question with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example:
            'Question with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found',
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
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    LoggerUtil.logInfo(
      this.logger,
      'QuestionsController',
      'Deleting question',
      { questionId: id },
    );

    try {
      const result = await this.questionsService.deleteQuestion(id);

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsController',
        'Question deleted successfully',
        { questionId: id },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsController',
        'Failed to delete question',
        error,
        { questionId: id },
      );
      throw error;
    }
  }

  @Get('teacher')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get questions by teacher ID',
    description:
      'Retrieves all questions created by the authenticated teacher. Teacher ID is extracted from the x-user-id header. Authentication is handled by the API Gateway.',
  })
  @ApiResponse({
    status: 200,
    description: 'Questions retrieved successfully',
    type: [QuestionResponseDto],
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: 'question-001',
            description: 'Unique identifier for the question',
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
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-10-04T10:30:00Z',
            description: 'Creation date of the question',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-10-04T10:30:00Z',
            description: 'Last update date of the question',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Teacher not found or has no questions',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'No questions found for teacher',
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
  async getQuestionsByTeacherId(
    @Req() req: AuthenticatedRequest,
  ): Promise<QuestionResponseDto[]> {
    const teacherId = req.user.id; // Get teacher ID from x-user-id header (via req.user.id)

    LoggerUtil.logInfo(
      this.logger,
      'QuestionsController',
      'Fetching questions by teacher ID',
      {
        teacherId,
      },
    );

    try {
      const result =
        await this.questionsService.getQuestionsByTeacherId(teacherId);

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsController',
        'Questions by teacher retrieved successfully',
        {
          teacherId,
          questionsCount: result.length,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'QuestionsController',
        'Failed to retrieve questions by teacher',
        error,
        {
          teacherId,
        },
      );
      throw error;
    }
  }
}
