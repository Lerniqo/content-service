import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConceptResponseDto } from './dto/concept-response.dto';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { ConceptsService } from './concepts.service';
import { PinoLogger } from 'nestjs-pino';
import { LoggerUtil } from '../common/utils/logger.util';

@ApiTags('concepts')
@Controller('concepts')
export class ConceptsController {
  constructor(
    private readonly conceptsService: ConceptsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConceptsController.name);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all concepts',
    description:
      'Retrieves all concepts with their prerequisites and associated learning resources. This endpoint is public and requires no authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Concepts retrieved successfully',
    type: [ConceptResponseDto],
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
  async getAllConcepts(): Promise<ConceptResponseDto[]> {
    LoggerUtil.logInfo(
      this.logger,
      'ConceptsController',
      'Request to get all concepts',
      {},
    );

    try {
      const result = await this.conceptsService.getAllConcepts();

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsController',
        'All concepts retrieved successfully',
        { count: result.length },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ConceptsController',
        'Failed to retrieve concepts',
        error,
        {},
      );
      throw error;
    }
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get concept by ID',
    description:
      'Retrieves a specific concept with its prerequisites and associated learning resources. This endpoint is public and requires no authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Concept retrieved successfully',
    type: ConceptResponseDto,
    schema: {
      type: 'object',
      properties: {
        conceptId: {
          type: 'string',
          format: 'uuid',
          example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
          description: 'Unique identifier for the concept',
        },
        name: {
          type: 'string',
          example: 'Multiplication of Fractions (ATM001)',
          description: 'Name of the concept',
        },
        type: {
          type: 'string',
          example: 'Atom',
          enum: ['Subject', 'Matter', 'Molecule', 'Atom', 'Particle'],
          description: 'Type of the concept in the hierarchy',
        },
        description: {
          type: 'string',
          example: 'Learn how to multiply fractions step by step',
          description: 'Description of the concept',
        },
        prerequisites: {
          type: 'array',
          description: 'Array of prerequisite concepts',
          items: {
            type: 'object',
            properties: {
              conceptId: {
                type: 'string',
                example: 'abc123-def456-ghi789',
                description: 'ID of the prerequisite concept',
              },
              name: {
                type: 'string',
                example: 'Basic Addition (ATM001)',
                description: 'Name of the prerequisite concept',
              },
              type: {
                type: 'string',
                example: 'Atom',
                description: 'Type of the prerequisite concept',
              },
              description: {
                type: 'string',
                example: 'Fundamental addition operations',
                description: 'Description of the prerequisite concept',
              },
            },
          },
        },
        learningResources: {
          type: 'array',
          description: 'Array of learning resources',
          items: {
            type: 'object',
            properties: {
              resourceId: {
                type: 'string',
                example: 'res123-456-789',
                description: 'ID of the learning resource',
              },
              name: {
                type: 'string',
                example: 'Fractions Video Tutorial',
                description: 'Name of the learning resource',
              },
              type: {
                type: 'string',
                example: 'video',
                description: 'Type of the learning resource',
              },
              description: {
                type: 'string',
                example: 'A comprehensive video tutorial on fractions',
                description: 'Description of the learning resource',
              },
              url: {
                type: 'string',
                example: 'https://example.com/resources/fractions-video',
                description: 'URL of the learning resource',
              },
              isPublic: {
                type: 'boolean',
                example: true,
                description: 'Whether the resource is publicly accessible',
              },
              price: {
                type: 'number',
                example: 9.99,
                description: 'Price of the resource',
              },
            },
          },
        },
        createdAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-10-04T10:30:00Z',
          description: 'Creation date of the concept',
        },
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
          example: 'Concept with ID abc123 not found',
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
  async getConceptById(
    @Param('id') conceptId: string,
  ): Promise<ConceptResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ConceptsController',
      'Public concept request received',
      { conceptId },
    );

    try {
      const result = await this.conceptsService.getConceptById(conceptId);

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsController',
        'Concept retrieved successfully',
        {
          conceptId,
          prerequisitesCount: result.prerequisites.length,
          resourcesCount: result.learningResources.length,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ConceptsController',
        'Failed to retrieve concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new concept',
    description:
      'Creates a new concept with optional prerequisites. This endpoint is public and requires no authentication.',
  })
  @ApiBody({ type: CreateConceptDto })
  @ApiResponse({
    status: 201,
    description: 'Concept created successfully',
    type: ConceptResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input or prerequisite not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'One or more prerequisite concepts not found',
        },
        error: { type: 'string', example: 'Bad Request' },
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
  async createConcept(
    @Body() createConceptDto: CreateConceptDto,
  ): Promise<ConceptResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ConceptsController',
      'Request to create new concept',
      { name: createConceptDto.name, type: createConceptDto.type },
    );

    try {
      const result = await this.conceptsService.createConcept(createConceptDto);

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsController',
        'Concept created successfully',
        { conceptId: result.conceptId },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ConceptsController',
        'Failed to create concept',
        error,
        { name: createConceptDto.name },
      );
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a concept',
    description:
      'Updates an existing concept. All fields are optional. This endpoint is public and requires no authentication.',
  })
  @ApiBody({ type: UpdateConceptDto })
  @ApiResponse({
    status: 200,
    description: 'Concept updated successfully',
    type: ConceptResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input or circular dependency detected',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Circular dependency detected in prerequisites',
        },
        error: { type: 'string', example: 'Bad Request' },
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
          example: 'Concept with ID abc123 not found',
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
  async updateConcept(
    @Param('id') conceptId: string,
    @Body() updateConceptDto: UpdateConceptDto,
  ): Promise<ConceptResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'ConceptsController',
      'Request to update concept',
      { conceptId, updates: Object.keys(updateConceptDto) },
    );

    try {
      const result = await this.conceptsService.updateConcept(
        conceptId,
        updateConceptDto,
      );

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsController',
        'Concept updated successfully',
        { conceptId },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ConceptsController',
        'Failed to update concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete a concept',
    description:
      'Deletes a concept. Cannot delete if the concept is a prerequisite for other concepts. This endpoint is public and requires no authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Concept deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Concept with ID abc123 deleted successfully',
        },
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
          example: 'Concept with ID abc123 not found',
        },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Concept is a prerequisite for other concepts',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example:
            'Cannot delete concept. It is a prerequisite for 3 other concept(s)',
        },
        error: { type: 'string', example: 'Conflict' },
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
  async deleteConcept(
    @Param('id') conceptId: string,
  ): Promise<{ message: string }> {
    LoggerUtil.logInfo(
      this.logger,
      'ConceptsController',
      'Request to delete concept',
      { conceptId },
    );

    try {
      const result = await this.conceptsService.deleteConcept(conceptId);

      LoggerUtil.logInfo(
        this.logger,
        'ConceptsController',
        'Concept deleted successfully',
        { conceptId },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'ConceptsController',
        'Failed to delete concept',
        error,
        { conceptId },
      );
      throw error;
    }
  }
}
