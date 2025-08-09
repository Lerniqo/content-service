import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CreateConceptDto } from './dto/create-concept.dto';
import { ConceptsService } from './concepts.service';
import { Logger } from 'nestjs-pino';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { Request } from 'express';

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
        private readonly logger: Logger,
    ) {}

    @Post()
    @Roles('admin')
    async create(
        @Body() createConceptDto: CreateConceptDto,
        @Req() req: AuthenticatedRequest
    ) {
        const adminId = req.user.id;
        this.logger.log(`Creating concept with data: ${JSON.stringify(createConceptDto)} by ${adminId}`, ConceptsController.name);
        return this.conceptsService.createConcept(createConceptDto, adminId);
    }
}
