import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CreateConceptDto } from './dto/create-concept.dto';
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
}
