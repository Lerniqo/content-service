import {
  Body,
  Controller,
  Post,
  Put,
  Delete,
  Get,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateResourceResponseDto } from './dto/create-resource-response.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { DeleteResourceResponseDto } from './dto/delete-resource-response.dto';
import { ResourcesService } from './resources.service';
import { PinoLogger } from 'nestjs-pino';
import { Public } from '../auth/decorators/public.decorator';
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
export class ResourcesController {
  constructor(
    private readonly resourcesService: ResourcesService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ResourcesController.name);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
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

  @Get(':id')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get a resource by ID',
    description:
      'Retrieves a specific resource by its ID. This endpoint is public and does not require authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        resourceId: {
          type: 'string',
          format: 'uuid',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
        },
        name: {
          type: 'string',
          example: 'Fractions Video',
        },
        type: {
          type: 'string',
          example: 'video',
        },
        description: {
          type: 'string',
          example: 'A comprehensive video explaining fraction operations',
        },
        url: {
          type: 'string',
          format: 'url',
          example: 'https://example.com/resources/fractions',
        },
        isPublic: {
          type: 'boolean',
          example: true,
        },
        price: {
          type: 'number',
          example: 9.99,
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['mathematics', 'fractions'],
        },
        gradeLevel: {
          type: 'string',
          example: 'Grade 6',
        },
        subject: {
          type: 'string',
          example: 'Mathematics',
        },
        publishedBy: {
          type: 'string',
          example: 'user-123',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Resource with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example:
            'Resource with ID f47ac10b-58cc-4372-a567-0e02b2c3d479 not found',
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
  async getById(@Param('id') resourceId: string): Promise<Record<string, any>> {
    LoggerUtil.logInfo(
      this.logger,
      'ResourcesController',
      'Fetching resource by ID',
      { resourceId },
    );

    try {
      const result = await this.resourcesService.fetchResourceById(resourceId);

      LoggerUtil.logInfo(
        this.logger,
        'ResourcesController',
        'Resource fetched successfully',
        { resourceId, name: (result.name as string | undefined) || '' },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesController',
        'Failed to fetch resource',
        error,
        { resourceId },
      );
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update an existing resource',
    description:
      'Updates an existing resource with new data. Admin can update any resource, Teacher can only update resources they published. Returns the full updated resource object.',
  })
  @ApiBody({
    type: UpdateResourceDto,
    description: 'The resource data to update',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource updated successfully',
    schema: {
      type: 'object',
      properties: {
        resourceId: {
          type: 'string',
          format: 'uuid',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          description: 'Unique identifier for the resource',
        },
        name: {
          type: 'string',
          example: 'Updated Fractions Video',
          description: 'Name of the resource',
        },
        type: {
          type: 'string',
          example: 'video',
          description: 'Type of the resource',
        },
        description: {
          type: 'string',
          example:
            'An updated comprehensive video explaining fraction operations',
          description: 'Description of the resource',
        },
        url: {
          type: 'string',
          format: 'url',
          example: 'https://example.com/resources/fractions-updated',
          description: 'URL where the resource content is located',
        },
        isPublic: {
          type: 'boolean',
          example: true,
          description: 'Whether the resource is publicly accessible',
        },
        price: {
          type: 'number',
          example: 12.99,
          description: 'Price of the resource (if not free)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          example: ['mathematics', 'fractions', 'updated'],
          description: 'Tags associated with the resource',
        },
        gradeLevel: {
          type: 'string',
          example: 'Grade 9',
          description: 'Grade level for this resource',
        },
        subject: {
          type: 'string',
          example: 'Advanced Mathematics',
          description: 'Subject area for this resource',
        },
        publishedBy: {
          type: 'string',
          example: 'user-123',
          description: 'ID of the user who published this resource',
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
          description: 'Creation date of the resource',
        },
        updatedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-16T14:45:00Z',
          description: 'Last update date of the resource',
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
                'Name must be between 2 and 255 characters',
                'URL must be a valid URL',
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
    description:
      'Forbidden - Teacher or Admin role required, or Teacher trying to update resource they do not own',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          example:
            'Access denied. You can only update resources that you published.',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Resource with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Resource with ID abc123 not found',
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
  async update(
    @Param('id') resourceId: string,
    @Body() updateResourceDto: UpdateResourceDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<Record<string, any>> {
    const userId = req.user.id;
    const userRole = req.user.role;

    LoggerUtil.logInfo(
      this.logger,
      'ResourcesController',
      'Updating resource',
      {
        resourceId,
        userId,
        userRole,
        updates: Object.keys(updateResourceDto),
      },
    );

    try {
      const result = await this.resourcesService.updateResource(
        resourceId,
        updateResourceDto,
        userId,
        userRole,
      );

      LoggerUtil.logInfo(
        this.logger,
        'ResourcesController',
        'Resource updated successfully',
        {
          resourceId,
          userId,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesController',
        'Failed to update resource',
        error,
        {
          resourceId,
          userId,
          updates: Object.keys(updateResourceDto),
        },
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete an existing resource',
    description:
      'Deletes an existing resource and all its relationships from the Neo4j database. Admin can delete any resource, Teacher can only delete resources they published. The actual file deletion from cloud storage is handled asynchronously.',
  })
  @ApiResponse({
    status: 200,
    description: 'Resource deleted successfully',
    type: DeleteResourceResponseDto,
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
    description:
      'Forbidden - Teacher or Admin role required, or Teacher trying to delete resource they do not own',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          example:
            'Access denied. You can only delete resources that you published.',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Resource with specified ID not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: {
          type: 'string',
          example: 'Resource with ID abc123 not found',
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
  async delete(
    @Param('id') resourceId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<DeleteResourceResponseDto> {
    const userId = req.user.id;
    const userRole = req.user.role;

    LoggerUtil.logInfo(
      this.logger,
      'ResourcesController',
      'Deleting resource',
      {
        resourceId,
        userId,
        userRole,
      },
    );

    try {
      await this.resourcesService.deleteResource(resourceId, userId, userRole);

      LoggerUtil.logInfo(
        this.logger,
        'ResourcesController',
        'Resource deleted successfully',
        {
          resourceId,
          userId,
        },
      );

      return new DeleteResourceResponseDto(resourceId);
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ResourcesController',
        'Failed to delete resource',
        error,
        {
          resourceId,
          userId,
        },
      );
      throw error;
    }
  }
}
