/* eslint-disable prettier/prettier */
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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { SyllabusResponseDto } from './dto/syllabus-response.dto';
import { SyllabusConceptDto } from './dto/syllabus-concept.dto';
import { CreateSyllabusConceptDto } from './dto/create-syllabus-concept.dto';
import { UpdateSyllabusConceptDto } from './dto/update-syllabus-concept.dto';
import { SyllabusService } from './syllabus.service';
import { PinoLogger } from 'nestjs-pino';
import { LoggerUtil } from '../common/utils/logger.util';

@ApiTags('syllabus')
@Controller('syllabus')
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

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get syllabus concept by ID',
    description:
      'Retrieves a specific syllabus concept by its ID, including its direct children. This endpoint is public and requires no authentication.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the syllabus concept',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 200,
    description: 'Syllabus concept retrieved successfully',
    type: SyllabusConceptDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Syllabus concept not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Syllabus concept with ID ... not found' },
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
        message: { type: 'string', example: 'Failed to retrieve syllabus concept' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async getConceptById(@Param('id') id: string): Promise<SyllabusConceptDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusController',
      'Get syllabus concept by ID request received',
      { conceptId: id },
    );

    try {
      const result = await this.syllabusService.getConceptById(id);

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusController',
        'Syllabus concept retrieved successfully',
        { conceptId: id, name: result.name },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusController',
        'Failed to retrieve syllabus concept',
        error,
        { conceptId: id },
      );
      throw error;
    }
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new syllabus concept',
    description:
      'Creates a new syllabus concept in the hierarchy. Optionally, it can be nested under a parent concept.',
  })
  @ApiBody({ type: CreateSyllabusConceptDto })
  @ApiResponse({
    status: 201,
    description: 'Syllabus concept created successfully',
    type: SyllabusConceptDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'array', items: { type: 'string' } },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Parent concept not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Parent concept with ID ... not found' },
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
        message: { type: 'string', example: 'Failed to create syllabus concept' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async createConcept(@Body() createDto: CreateSyllabusConceptDto): Promise<SyllabusConceptDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusController',
      'Create syllabus concept request received',
      { name: createDto.name, type: createDto.type },
    );

    try {
      const result = await this.syllabusService.createConcept(createDto);

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusController',
        'Syllabus concept created successfully',
        { conceptId: result.conceptId, name: result.name },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusController',
        'Failed to create syllabus concept',
        error,
        { name: createDto.name },
      );
      throw error;
    }
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a syllabus concept',
    description:
      'Updates an existing syllabus concept. All fields are optional. You can also change the parent concept.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the syllabus concept to update',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiBody({ type: UpdateSyllabusConceptDto })
  @ApiResponse({
    status: 200,
    description: 'Syllabus concept updated successfully',
    type: SyllabusConceptDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or circular reference',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'A concept cannot be its own parent' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Syllabus concept or parent concept not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Syllabus concept with ID ... not found' },
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
        message: { type: 'string', example: 'Failed to update syllabus concept' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async updateConcept(
    @Param('id') id: string,
    @Body() updateDto: UpdateSyllabusConceptDto,
  ): Promise<SyllabusConceptDto> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusController',
      'Update syllabus concept request received',
      { conceptId: id, updates: Object.keys(updateDto) },
    );

    try {
      const result = await this.syllabusService.updateConcept(id, updateDto);

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusController',
        'Syllabus concept updated successfully',
        { conceptId: id },
      );

      return result;
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusController',
        'Failed to update syllabus concept',
        error,
        { conceptId: id },
      );
      throw error;
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a syllabus concept',
    description:
      'Deletes a syllabus concept. The concept must not have any children. Delete or reassign children first.',
  })
  @ApiParam({
    name: 'id',
    description: 'UUID of the syllabus concept to delete',
    example: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  })
  @ApiResponse({
    status: 204,
    description: 'Syllabus concept deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Concept has children',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: 'Cannot delete concept with children. Delete children first or reassign them.' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Syllabus concept not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Syllabus concept with ID ... not found' },
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
        message: { type: 'string', example: 'Failed to delete syllabus concept' },
        error: { type: 'string', example: 'Internal Server Error' },
      },
    },
  })
  async deleteConcept(@Param('id') id: string): Promise<void> {
    LoggerUtil.logInfo(
      this.logger,
      'SyllabusController',
      'Delete syllabus concept request received',
      { conceptId: id },
    );

    try {
      await this.syllabusService.deleteConcept(id);

      LoggerUtil.logInfo(
        this.logger,
        'SyllabusController',
        'Syllabus concept deleted successfully',
        { conceptId: id },
      );
    } catch (error) {
      LoggerUtil.logError(
        this.logger,
        'SyllabusController',
        'Failed to delete syllabus concept',
        error,
        { conceptId: id },
      );
      throw error;
    }
  }
}