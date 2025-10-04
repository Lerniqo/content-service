import { Controller, Get, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConceptResponseDto } from './dto/concept-response.dto';
import { ConceptsService } from './concepts.service';
import { PinoLogger } from 'nestjs-pino';
import { LoggerUtil } from '../common/utils/logger.util';

@ApiTags('concepts')
@Controller('api/content/concepts')
export class ConceptsController {
  constructor(
    private readonly conceptsService: ConceptsService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConceptsController.name);
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
}
