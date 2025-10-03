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
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateResourceResponseDto } from './dto/create-resource-response.dto';
import { ResourcesService } from './resources.service';
import { PinoLogger } from 'nestjs-pino';
import { RolesGuard } from '../auth/roles/roles.guard';
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

@ApiTags('resources')
@Controller('resources')
@UseGuards(RolesGuard)
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResourcesController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles('teacher', 'admin')
  @ApiOperation({
    summary: 'Create a new resource',
    description:
      'Creates a new resource with metadata, establishes relationships with concepts and users, and generates a presigned URL for file upload. Teacher and Admin roles required.',
  })
  @ApiBody({
    type: CreateResourceDto,
    description: 'The resource data to create',
  })
  @ApiResponse({
    status: 201,
    description: 'Resource created successfully',
    type: CreateResourceResponseDto,
    schema: {
      type: 'object',
      properties: {
        resourceId: {
          type: 'string',
          format: 'uuid',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          description: 'Unique identifier for the created resource',
        },
        uploadUrl: {
          type: 'string',
          format: 'url',
          example:
            'https://api-gateway.example.com/upload/abc123?signature=xyz789',
          description: 'Presigned URL for uploading the resource file',
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
                'Name is required',
                'Type must be a valid resource type',
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
    description: 'Not Found - Concept or user not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Concept with ID abc123 not found',
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
    @Body() createResourceDto: CreateResourceDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<CreateResourceResponseDto> {
    const userId = req.user.id;

    LoggerUtil.logInfo(
      this.logger,
      'ResourcesController',
      'Creating new resource',
      {
        resourceId: createResourceDto.resourceId,
        name: createResourceDto.name,
        type: createResourceDto.type,
        conceptId: createResourceDto.conceptId,
        userId,
        isPublic: createResourceDto.isPublic,
        price: createResourceDto.price,
      },
    );

    try {
      const result = await this.resourcesService.createResource(
        createResourceDto,
        userId,
      );

      LoggerUtil.logInfo(
        this.logger,
        'ResourcesController',
        'Resource created successfully',
        {
          resourceId: result.resourceId,
          uploadUrl: result.uploadUrl,
          userId,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesController',
        'Failed to create resource',
        error,
        {
          resourceId: createResourceDto.resourceId,
          conceptId: createResourceDto.conceptId,
          userId,
        },
      );
      throw error;
    }
  }
}
