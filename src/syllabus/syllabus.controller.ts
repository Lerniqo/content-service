/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SyllabusResponseDto } from './dto/syllabus-response.dto';
import { SyllabusService } from './syllabus.service';
import { PinoLogger } from 'nestjs-pino';
import { LoggerUtil } from '../common/utils/logger.util';

@ApiTags('syllabus')
@Controller('api/content/syllabus')
export class SyllabusController {
  constructor(
    private readonly syllabusService: SyllabusService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(SyllabusController.name);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get complete syllabus tree',
    description:
      'Retrieves the complete hierarchical syllabus structure including all concepts and their relationships. This endpoint is public and requires no authentication.',
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus retrieved successfully',
    type: SyllabusResponseDto,
    schema: {
      type: 'object',
      properties: {
        syllabus: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              conceptId: {
                type: 'string',
                example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
                description: 'Unique identifier for the concept',
              },
              name: {
                type: 'string',
                example: 'Ordinary Level Mathematics (OLM001)',
                description: 'Name of the concept',
              },
              type: {
                type: 'string',
                example: 'Subject',
                enum: ['Subject', 'Matter', 'Molecule', 'Atom', 'Particle', 'Grade', 'Topic'],
                description: 'Type of the concept in the hierarchy',
              },
              description: {
                type: 'string',
                example: 'Core mathematics curriculum for ordinary level',
                description: 'Description of the concept',
              },
              children: {
                type: 'array',
                description: 'Child concepts contained within this concept',
                items: {
                  $ref: '#/components/schemas/SyllabusConceptDto',
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
        },
        totalConcepts: {
          type: 'number',
          example: 150,
          description: 'Total number of concepts in the syllabus',
        },
        retrievedAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-10-04T10:30:00Z',
          description: 'Timestamp when the syllabus was retrieved',
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
        message: { type: 'string', example: 'Failed to retrieve syllabus' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async getSyllabus(): Promise<SyllabusResponseDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusController',
      'Public syllabus request received',
      {},
    );

    try {
      const result = await this.syllabusService.getSyllabus();

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusController',
        'Syllabus retrieved successfully',
        {
          totalConcepts: result.totalConcepts,
          rootNodes: result.syllabus.length,
        },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusController',
        'Failed to retrieve syllabus',
        error,
        {},
      );
      throw error;
    }
  }
}