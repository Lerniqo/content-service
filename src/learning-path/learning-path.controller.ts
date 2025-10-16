/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiHeader } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { RequestLearningPathDto } from './dto/request-learning-path.dto';
import { LearningPathResponseDto } from './dto/learning-path-response.dto';
import { GetLearningPathResponseDto } from './dto/learning-path.dto';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
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

@ApiTags('learning-path')
@Controller('learning-path')
@UseGuards(RolesGuard)
export class LearningPathController {
  constructor(
    private readonly learningPathService: LearningPathService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(LearningPathController.name);
  }

  @Post('request')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({
    summary: 'Request a learning path generation',
    description:
      'Submit a learning goal to generate a personalized learning path. The AI service will process this asynchronously.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'User ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Learning path generation request accepted',
    type: LearningPathResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to initiate learning path generation',
  })
  async requestLearningPath(
    @Headers('x-user-id') userId: string,
    @Body() dto: RequestLearningPathDto,
  ): Promise<LearningPathResponseDto> {

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Request learning path generation',
      { userId, learningGoal: dto.learningGoal },
    );

    const result = await this.learningPathService.requestLearningPath(
      userId,
      dto,
    );

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Learning path request accepted',
      { userId, requestId: result.requestId },
    );

    return result;
  }

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({
    summary: 'Create a new learning path',
    description:
      'Create a new learning path for a user. If the user already has a learning path, it will be replaced.',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'User ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Learning path created successfully',
    type: GetLearningPathResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to create learning path',
  })
  async createLearningPath(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateLearningPathDto,
  ): Promise<GetLearningPathResponseDto> {

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Creating new learning path',
      { userId, learningGoal: dto.learningGoal },
    );

    const result = await this.learningPathService.createLearningPath(
      userId,
      dto,
    );

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Learning path created successfully',
      { userId, learningPathId: result.id },
    );

    return result;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({
    summary: 'Get all learning paths for the authenticated user',
    description: 'Retrieve all learning paths created for the current user',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'User ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning paths retrieved successfully',
    type: [GetLearningPathResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch learning paths',
  })
  async getUserLearningPaths(
    @Headers('x-user-id') userId: string,
  ): Promise<GetLearningPathResponseDto[]> {

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Fetching user learning paths',
      { userId },
    );

    const result = await this.learningPathService.getUserLearningPaths(userId);

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Learning paths fetched successfully',
      { userId, count: result.length },
    );

    return result;
  }

  @Get('')
  @HttpCode(HttpStatus.OK)
  @Roles('student', 'teacher', 'admin')
  @ApiOperation({
    summary: 'Get user learning path',
    description: 'Retrieve the learning path for the current user (one user can only have one learning path)',
  })
  @ApiHeader({
    name: 'x-user-id',
    description: 'User ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Learning path retrieved successfully',
    type: GetLearningPathResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Learning path not found',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to fetch learning path',
  })
  async getLearningPathByUserId(
    @Headers('x-user-id') userId: string,
  ): Promise<GetLearningPathResponseDto> {

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Fetching learning path by user ID',
      { userId },
    );

    const result = await this.learningPathService.getLearningPathByUserId(
      userId,
    );

    LoggerUtil.logInfo(
      this.logger,
      'LearningPathController',
      'Learning path fetched successfully',
      { userId },
    );

    return result;
  }
}
