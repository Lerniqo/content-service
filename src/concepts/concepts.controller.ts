import { Body, Controller, Post, Put, Param, Req, UseGuards, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { CreateConceptDto } from './dto/create-concept.dto';
import { UpdateConceptDto } from './dto/update-concept.dto';
import { CreatePrerequisiteDto } from './dto/create-prerequisite.dto';
import { ConceptsService } from './concepts.service';
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

@ApiTags('concepts')
@ApiBearerAuth()
@Controller('concepts')
@UseGuards(RolesGuard)
export class ConceptsController {
    constructor(
        private readonly conceptsService: ConceptsService,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(ConceptsController.name);
    }

    @Post()
    @Roles('admin')
    async create(
        @Body() createConceptDto: CreateConceptDto,
        @Req() req: AuthenticatedRequest
    ) {
        const adminId = req.user.id;
        
        LoggerUtil.logInfo(
            this.logger,
            'ConceptsController',
            'Creating concept',
            {
                conceptId: createConceptDto.id,
                name: createConceptDto.name,
                type: createConceptDto.type,
                parentId: createConceptDto.parentId,
                adminId
            }
        );

        try {
            const result = await this.conceptsService.createConcept(createConceptDto, adminId);
            
            LoggerUtil.logInfo(
                this.logger,
                'ConceptsController',
                'Concept created successfully',
                { conceptId: createConceptDto.id, adminId }
            );
            
            return result;
        } catch (error) {
            LoggerUtil.logError(
                this.logger,
                'ConceptsController',
                'Failed to create concept',
                error,
                { conceptId: createConceptDto.id, adminId }
            );
            throw error;
        }
    }

    @Put(':id')
    @HttpCode(HttpStatus.OK)
    @Roles('admin')
    @ApiOperation({ 
        summary: 'Update a concept',
        description: 'Updates an existing concept with new data. Admin role required.'
    })
    @ApiParam({
        name: 'id',
        description: 'The unique identifier of the concept to update',
        example: 'concept-123'
    })
    @ApiBody({
        type: UpdateConceptDto,
        description: 'The concept data to update'
    })
    @ApiResponse({
        status: 200,
        description: 'Concept updated successfully',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', example: 'concept-123' },
                name: { type: 'string', example: 'Updated Matter' },
                type: { type: 'string', example: 'Matter' }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid input data'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication required'
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin role required'
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - Concept or parent concept not found'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal Server Error - Database or server error'
    })
    async update(
        @Param('id') id: string,
        @Body() updateConceptDto: UpdateConceptDto,
        @Req() req: AuthenticatedRequest
    ) {
        // Validate the ID parameter
        if (!id || id.trim().length === 0) {
            throw new BadRequestException('Concept ID cannot be empty');
        }

        const adminId = req.user.id;
        
        LoggerUtil.logInfo(
            this.logger,
            'ConceptsController',
            'Updating concept',
            {
                conceptId: id,
                updateData: updateConceptDto,
                adminId
            }
        );

        try {
            const result = await this.conceptsService.updateConcept(id, updateConceptDto, adminId);
            
            LoggerUtil.logInfo(
                this.logger,
                'ConceptsController',
                'Concept updated successfully',
                { conceptId: id, adminId }
            );
            
            return result;
        } catch (error) {
            LoggerUtil.logError(
                this.logger,
                'ConceptsController',
                'Failed to update concept',
                error,
                { conceptId: id, adminId }
            );
            throw error;
        }
    }

    @Post(':id/prerequisites')
    @HttpCode(HttpStatus.OK)
    @Roles('admin')
    @ApiOperation({ 
        summary: 'Create a prerequisite relationship',
        description: 'Creates a HAS_PREREQUISITE relationship from one concept to another. Admin role required.'
    })
    @ApiParam({
        name: 'id',
        description: 'The unique identifier of the concept that will have the prerequisite',
        example: 'concept-123'
    })
    @ApiBody({
        type: CreatePrerequisiteDto,
        description: 'The prerequisite concept data'
    })
    @ApiResponse({
        status: 200,
        description: 'Prerequisite relationship created successfully',
        schema: {
            type: 'object',
            properties: {
                message: { 
                    type: 'string', 
                    example: 'Prerequisite relationship created successfully' 
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request - Invalid input data or missing prerequisiteId'
    })
    @ApiResponse({
        status: 401,
        description: 'Unauthorized - Authentication required'
    })
    @ApiResponse({
        status: 403,
        description: 'Forbidden - Admin role required'
    })
    @ApiResponse({
        status: 404,
        description: 'Not Found - One or both concepts not found'
    })
    @ApiResponse({
        status: 500,
        description: 'Internal Server Error - Relationship creation failed'
    })
    async createPrerequisite(
        @Param('id') id: string,
        @Body() createPrerequisiteDto: CreatePrerequisiteDto,
        @Req() req: AuthenticatedRequest
    ) {
        // Validate the ID parameter
        if (!id || id.trim().length === 0) {
            throw new BadRequestException('Concept ID cannot be empty');
        }

        const adminId = req.user.id;
        
        LoggerUtil.logInfo(
            this.logger,
            'ConceptsController',
            'Creating prerequisite relationship',
            {
                conceptId: id,
                prerequisiteId: createPrerequisiteDto.prerequisiteId,
                adminId
            }
        );

        try {
            const result = await this.conceptsService.createPrerequisiteRelationship(
                id, 
                createPrerequisiteDto.prerequisiteId, 
                adminId
            );
            
            LoggerUtil.logInfo(
                this.logger,
                'ConceptsController',
                'Prerequisite relationship created successfully',
                { conceptId: id, prerequisiteId: createPrerequisiteDto.prerequisiteId, adminId }
            );
            
            return result;
        } catch (error) {
            LoggerUtil.logError(
                this.logger,
                'ConceptsController',
                'Failed to create prerequisite relationship',
                error,
                { conceptId: id, prerequisiteId: createPrerequisiteDto.prerequisiteId, adminId }
            );
            throw error;
        }
    }
}
