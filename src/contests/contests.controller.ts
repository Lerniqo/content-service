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
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam } from '@nestjs/swagger';
import { CreateContestDto } from './dto/create-contest.dto';
import { UpdateContestDto } from './dto/update-contest.dto';
import { CreateContestResponseDto } from './dto/create-contest-response.dto';
import { ContestResponseDto } from './dto/contest-response.dto';
import { ContestsService } from './contests.service';
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

@ApiTags('contests')
@Controller('contests')
@UseGuards(RolesGuard)
export class ContestsController {
  constructor(
    private readonly contestsService: ContestsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ContestsController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Create a new contest',
    description:
      'Creates a new contest with tasks. Only teachers and admins can create contests. Maximum 5 tasks allowed per contest.',
  })
  @ApiBody({
    type: CreateContestDto,
    description: 'The contest data to create',
  })
  @ApiResponse({
    status: 201,
    description: 'Contest created successfully',
    type: CreateContestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or start date not before end date',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Teacher or admin role required',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async createContest(
    @Body() createContestDto: CreateContestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateContestResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsController',
      'POST /contests - Creating new contest',
      { 
        contestName: createContestDto.contestName,
        userId: req.user?.id,
        userRole: req.user?.role,
      },
    );

    return await this.contestsService.createContest(createContestDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all contests',
    description: 'Retrieves all contests with their tasks.',
  })
  @ApiResponse({
    status: 200,
    description: 'Contests retrieved successfully',
    type: [ContestResponseDto],
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getAllContests(@Req() req: AuthenticatedRequest): Promise<ContestResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsController',
      'GET /contests - Fetching all contests',
      { userId: req.user?.id },
    );

    return await this.contestsService.getAllContests();
  }

  @Get('available')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get available contests for participation',
    description:
      'Retrieves contests that students can participate in (contests that have not started yet).',
  })
  @ApiResponse({
    status: 200,
    description: 'Available contests retrieved successfully',
    type: [ContestResponseDto],
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getAvailableContests(
    @Req() req: AuthenticatedRequest,
  ): Promise<ContestResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsController',
      'GET /contests/available - Fetching available contests',
      { userId: req.user?.id },
    );

    return await this.contestsService.getAvailableContests();
  }

  @Get(':contestId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a contest by ID',
    description: 'Retrieves a specific contest with its tasks by contest ID.',
  })
  @ApiParam({
    name: 'contestId',
    description: 'The unique identifier of the contest',
    example: 'contest-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Contest retrieved successfully',
    type: ContestResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async getContestById(
    @Param('contestId') contestId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ContestResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsController',
      'GET /contests/:contestId - Fetching contest by ID',
      { contestId, userId: req.user?.id },
    );

    return await this.contestsService.getContestById(contestId);
  }

  @Get(':contestId/can-participate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if a student can participate in a contest',
    description:
      'Checks if the contest start date has not passed. Students can only participate if the contest has not started yet.',
  })
  @ApiParam({
    name: 'contestId',
    description: 'The unique identifier of the contest',
    example: 'contest-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Participation eligibility checked successfully',
    schema: {
      type: 'object',
      properties: {
        canParticipate: {
          type: 'boolean',
          example: true,
        },
        message: {
          type: 'string',
          example: 'You can participate in this contest.',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async canParticipate(
    @Param('contestId') contestId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ canParticipate: boolean; message: string }> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsController',
      'GET /contests/:contestId/can-participate - Checking participation eligibility',
      { contestId, userId: req.user?.id },
    );

    return await this.contestsService.canParticipate(contestId);
  }

  @Put(':contestId')
  @HttpCode(HttpStatus.OK)
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Update a contest',
    description:
      'Updates an existing contest. Only teachers and admins can update contests.',
  })
  @ApiParam({
    name: 'contestId',
    description: 'The unique identifier of the contest',
    example: 'contest-12345',
  })
  @ApiBody({
    type: UpdateContestDto,
    description: 'The contest data to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Contest updated successfully',
    type: ContestResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Teacher or admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async updateContest(
    @Param('contestId') contestId: string,
    @Body() updateContestDto: UpdateContestDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<ContestResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsController',
      'PUT /contests/:contestId - Updating contest',
      { 
        contestId,
        userId: req.user?.id,
        userRole: req.user?.role,
      },
    );

    return await this.contestsService.updateContest(contestId, updateContestDto);
  }

  @Delete(':contestId')
  @HttpCode(HttpStatus.OK)
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Delete a contest',
    description:
      'Deletes an existing contest and all its tasks. Only teachers and admins can delete contests.',
  })
  @ApiParam({
    name: 'contestId',
    description: 'The unique identifier of the contest',
    example: 'contest-12345',
  })
  @ApiResponse({
    status: 200,
    description: 'Contest deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Contest deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Teacher or admin role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Contest not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
  })
  async deleteContest(
    @Param('contestId') contestId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    LoggerUtil.logInfo(
      this.logger,
      'ContestsController',
      'DELETE /contests/:contestId - Deleting contest',
      { 
        contestId,
        userId: req.user?.id,
        userRole: req.user?.role,
      },
    );

    return await this.contestsService.deleteContest(contestId);
  }
}
