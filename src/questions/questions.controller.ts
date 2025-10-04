/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateQuestionResponseDto } from './dto/create-question-response.dto';
import { QuestionsService } from './questions.service';
import { PinoLogger } from 'nestjs-pino';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { LoggerUtil } from '../common/utils/logger.util';

@ApiTags('questions')
@Controller('api/content/questions')
@UseGuards(RolesGuard)
export class QuestionsController {
  constructor(
    private readonly questionsService: QuestionsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(QuestionsController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('admin')
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
  ): Promise<CreateQuestionResponseDto> {
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
      },
    );

    try {
      const result = await this.questionsService.createQuestion(createQuestionDto);

      LoggerUtil.logInfo(
        this.logger,
        'QuestionsController',
        'Question created successfully',
        {
          questionId: result.id,
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
        },
      );
      throw error;
    }
  }
}