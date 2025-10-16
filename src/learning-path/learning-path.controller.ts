/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LearningPathService } from './learning-path.service';
import { RequestLearningPathDto } from './dto/request-learning-path.dto';
import { LearningPathResponseDto } from './dto/learning-path-response.dto';
import { GetLearningPathResponseDto } from './dto/learning-path.dto';
import { CreateLearningPathDto } from './dto/create-learning-path.dto';
import { PinoLogger } from 'nestjs-pino';
import type { Request } from 'express';
import { LoggerUtil } from '../common/utils/logger.util';

@ApiTags('learning-path')
@Controller('learning-path')
export class LearningPathController {
  constructor(
    private readonly learningPathService: LearningPathService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(LearningPathController.name);
  }

  @Post('request')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a learning path generation',
    description:
      'Submit a learning goal to generate a personalized learning path. The AI service will process this asynchronously.',
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
    @Req() req: Request,
    @Body() dto: RequestLearningPathDto,
  ): Promise<LearningPathResponseDto> {
    const userIdFromHeader = req['headers']['x-user-id'] as string | string[] | undefined;
    const userId = Array.isArray(userIdFromHeader) 
      ? userIdFromHeader[0] 
      : userIdFromHeader;

    if (!userId) {
      throw new BadRequestException('User ID is required in x-user-id header');
    }

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
  @ApiOperation({
    summary: 'Create a new learning path',
    description:
      'Create a new learning path for a user. If the user already has a learning path, it will be replaced.',
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
    @Req() req: Request,
    @Body() dto: CreateLearningPathDto,
  ): Promise<GetLearningPathResponseDto> {
    const userIdFromHeader = req['headers']['x-user-id'] as string | string[] | undefined;
    const userId = Array.isArray(userIdFromHeader) 
      ? userIdFromHeader[0] 
      : userIdFromHeader;

    if (!userId) {
      throw new BadRequestException('User ID is required in x-user-id header');
    }

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
  @ApiOperation({
    summary: 'Get user learning path',
    description: 'Retrieve the learning path for the current user (one user can only have one learning path)',
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
    @Req() req: Request,
  ): Promise<GetLearningPathResponseDto> {
    const userIdFromHeader = req['headers']['x-user-id'] as string | string[] | undefined;
    const userId = Array.isArray(userIdFromHeader) 
      ? userIdFromHeader[0] 
      : userIdFromHeader;

    if (!userId) {
      throw new BadRequestException('User ID is required in x-user-id header');
    }

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
